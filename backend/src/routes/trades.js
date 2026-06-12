const express = require('express');
const router = express.Router();
const { supabaseDb: supabase } = require('../services/supabase');
const authMiddleware = require('../middleware/auth');

// Todas as rotas são protegidas
router.use(authMiddleware);

// GET /api/trades — Listar trocas pendentes (públicas)
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('trades')
      .select(`
        *,
        proposer:profiles!trades_proposer_id_fkey(id, username, avatar_url),
        receiver:profiles!trades_receiver_id_fkey(id, username, avatar_url),
        offered_sticker:stickers!trades_offered_sticker_id_fkey(*),
        wanted_sticker:stickers!trades_wanted_sticker_id_fkey(*)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Erro ao listar trocas:', err);
    res.status(500).json({ error: 'Erro ao listar trocas' });
  }
});

// GET /api/trades/my — Listar trocas do usuário (propostas e recebidas)
router.get('/my', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('trades')
      .select(`
        *,
        proposer:profiles!trades_proposer_id_fkey(id, username, avatar_url),
        receiver:profiles!trades_receiver_id_fkey(id, username, avatar_url),
        offered_sticker:stickers!trades_offered_sticker_id_fkey(*),
        wanted_sticker:stickers!trades_wanted_sticker_id_fkey(*)
      `)
      .or(`proposer_id.eq.${req.userId},receiver_id.eq.${req.userId}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Erro ao listar minhas trocas:', err);
    res.status(500).json({ error: 'Erro ao listar minhas trocas' });
  }
});

// POST /api/trades — Propor nova troca
router.post('/', async (req, res) => {
  try {
    const { offered_sticker_id, wanted_sticker_id } = req.body;

    if (!offered_sticker_id || !wanted_sticker_id) {
      return res.status(400).json({ error: 'Campos obrigatórios: offered_sticker_id, wanted_sticker_id' });
    }

    // Verificar se o usuário tem a figurinha oferecida e se tem repetida
    const { data: userSticker, error: checkError } = await supabase
      .from('user_stickers')
      .select('*')
      .eq('user_id', req.userId)
      .eq('sticker_id', offered_sticker_id)
      .single();

    if (checkError || !userSticker) {
      return res.status(400).json({ error: 'Você não possui essa figurinha' });
    }

    if (userSticker.quantity < 2) {
      return res.status(400).json({ error: 'Você precisa ter pelo menos 2 unidades para trocar (1 fica no álbum)' });
    }

    const { data, error } = await supabase
      .from('trades')
      .insert([{
        proposer_id: req.userId,
        offered_sticker_id,
        wanted_sticker_id,
        status: 'pending'
      }])
      .select(`
        *,
        proposer:profiles!trades_proposer_id_fkey(id, username, avatar_url),
        offered_sticker:stickers!trades_offered_sticker_id_fkey(*),
        wanted_sticker:stickers!trades_wanted_sticker_id_fkey(*)
      `)
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('Erro ao propor troca:', err);
    res.status(500).json({ error: 'Erro ao propor troca' });
  }
});

// PATCH /api/trades/:id/accept — Aceitar troca
router.patch('/:id/accept', async (req, res) => {
  try {
    // 1. Buscar a troca
    const { data: trade, error: findError } = await supabase
      .from('trades')
      .select('*')
      .eq('id', req.params.id)
      .eq('status', 'pending')
      .single();

    if (findError || !trade) {
      return res.status(404).json({ error: 'Troca não encontrada ou já finalizada' });
    }

    if (trade.proposer_id === req.userId) {
      return res.status(400).json({ error: 'Você não pode aceitar sua própria troca' });
    }

    // 2. Verificar se quem aceita tem a figurinha desejada com repetida
    const { data: acceptorSticker, error: checkError1 } = await supabase
      .from('user_stickers')
      .select('*')
      .eq('user_id', req.userId)
      .eq('sticker_id', trade.wanted_sticker_id)
      .single();

    if (checkError1 || !acceptorSticker || acceptorSticker.quantity < 2) {
      return res.status(400).json({ error: 'Você não tem essa figurinha repetida para trocar' });
    }

    // 3. Verificar se o propositor ainda tem a figurinha oferecida
    const { data: proposerSticker, error: checkError2 } = await supabase
      .from('user_stickers')
      .select('*')
      .eq('user_id', trade.proposer_id)
      .eq('sticker_id', trade.offered_sticker_id)
      .single();

    if (checkError2 || !proposerSticker || proposerSticker.quantity < 2) {
      // Cancelar a troca pois o propositor não tem mais a figurinha
      await supabase.from('trades').update({ status: 'rejected' }).eq('id', trade.id);
      return res.status(400).json({ error: 'Propositor não possui mais essa figurinha repetida' });
    }

    // 4. Efetuar a troca:
    // Propositor perde 1 da oferecida, ganha 1 da desejada
    await supabase
      .from('user_stickers')
      .update({ quantity: proposerSticker.quantity - 1 })
      .eq('id', proposerSticker.id);

    // Verificar se o propositor já tem a figurinha desejada
    const { data: proposerWanted } = await supabase
      .from('user_stickers')
      .select('*')
      .eq('user_id', trade.proposer_id)
      .eq('sticker_id', trade.wanted_sticker_id)
      .maybeSingle();

    if (proposerWanted) {
      await supabase
        .from('user_stickers')
        .update({ quantity: proposerWanted.quantity + 1 })
        .eq('id', proposerWanted.id);
    } else {
      await supabase
        .from('user_stickers')
        .insert([{
          user_id: trade.proposer_id,
          sticker_id: trade.wanted_sticker_id,
          quantity: 1,
          is_pasted: false
        }]);
    }

    // Quem aceita perde 1 da desejada (wanted), ganha 1 da oferecida
    await supabase
      .from('user_stickers')
      .update({ quantity: acceptorSticker.quantity - 1 })
      .eq('id', acceptorSticker.id);

    const { data: acceptorOffered } = await supabase
      .from('user_stickers')
      .select('*')
      .eq('user_id', req.userId)
      .eq('sticker_id', trade.offered_sticker_id)
      .maybeSingle();

    if (acceptorOffered) {
      await supabase
        .from('user_stickers')
        .update({ quantity: acceptorOffered.quantity + 1 })
        .eq('id', acceptorOffered.id);
    } else {
      await supabase
        .from('user_stickers')
        .insert([{
          user_id: req.userId,
          sticker_id: trade.offered_sticker_id,
          quantity: 1,
          is_pasted: false
        }]);
    }

    // 5. Atualizar status da troca
    const { data: updatedTrade, error: updateError } = await supabase
      .from('trades')
      .update({
        status: 'accepted',
        receiver_id: req.userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', trade.id)
      .select(`
        *,
        proposer:profiles!trades_proposer_id_fkey(id, username, avatar_url),
        receiver:profiles!trades_receiver_id_fkey(id, username, avatar_url),
        offered_sticker:stickers!trades_offered_sticker_id_fkey(*),
        wanted_sticker:stickers!trades_wanted_sticker_id_fkey(*)
      `)
      .single();

    if (updateError) throw updateError;
    res.json({ message: 'Troca realizada com sucesso!', trade: updatedTrade });
  } catch (err) {
    console.error('Erro ao aceitar troca:', err);
    res.status(500).json({ error: 'Erro ao aceitar troca' });
  }
});

// PATCH /api/trades/:id/reject — Rejeitar troca
router.patch('/:id/reject', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('trades')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('status', 'pending')
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Troca não encontrada' });

    res.json({ message: 'Troca rejeitada', trade: data });
  } catch (err) {
    console.error('Erro ao rejeitar troca:', err);
    res.status(500).json({ error: 'Erro ao rejeitar troca' });
  }
});

// DELETE /api/trades/:id — Cancelar troca própria
router.delete('/:id', async (req, res) => {
  try {
    const { data: trade, error: findError } = await supabase
      .from('trades')
      .select('*')
      .eq('id', req.params.id)
      .eq('proposer_id', req.userId)
      .eq('status', 'pending')
      .single();

    if (findError || !trade) {
      return res.status(404).json({ error: 'Troca não encontrada ou você não é o propositor' });
    }

    const { error } = await supabase
      .from('trades')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Troca cancelada com sucesso' });
  } catch (err) {
    console.error('Erro ao cancelar troca:', err);
    res.status(500).json({ error: 'Erro ao cancelar troca' });
  }
});

module.exports = router;
