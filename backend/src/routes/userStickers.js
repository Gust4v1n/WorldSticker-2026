const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');
const authMiddleware = require('../middleware/auth');

// Todas as rotas são protegidas
router.use(authMiddleware);

// GET /api/user-stickers — Listar coleção do usuário autenticado
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_stickers')
      .select(`
        *,
        sticker:stickers(*)
      `)
      .eq('user_id', req.userId)
      .order('sticker_id', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Erro ao listar coleção:', err);
    res.status(500).json({ error: 'Erro ao listar coleção' });
  }
});

// GET /api/user-stickers/duplicates — Listar figurinhas repetidas
router.get('/duplicates', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_stickers')
      .select(`
        *,
        sticker:stickers(*)
      `)
      .eq('user_id', req.userId)
      .gt('quantity', 1)
      .order('sticker_id', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Erro ao listar repetidas:', err);
    res.status(500).json({ error: 'Erro ao listar repetidas' });
  }
});

// POST /api/user-stickers/open-pack — Abrir pacotinho (5 figurinhas aleatórias)
router.post('/open-pack', async (req, res) => {
  try {
    // 1. Buscar todas as figurinhas do catálogo
    const { data: allStickers, error: fetchError } = await supabase
      .from('stickers')
      .select('id, name, rarity');

    if (fetchError) throw fetchError;

    if (!allStickers || allStickers.length === 0) {
      return res.status(400).json({ error: 'Nenhuma figurinha cadastrada no catálogo' });
    }

    // 2. Sortear 5 figurinhas aleatórias (com peso por raridade)
    const sortedStickers = [];
    for (let i = 0; i < 5; i++) {
      const weighted = allStickers.flatMap(s => {
        if (s.rarity === 'lendário') return [s];              // peso 1
        if (s.rarity === 'raro') return [s, s, s];             // peso 3
        return [s, s, s, s, s, s];                              // comum: peso 6
      });
      const random = weighted[Math.floor(Math.random() * weighted.length)];
      sortedStickers.push(random);
    }

    // 3. Para cada figurinha sorteada, inserir ou incrementar quantity
    const results = [];
    for (const sticker of sortedStickers) {
      // Verificar se o usuário já tem essa figurinha
      const { data: existing, error: checkError } = await supabase
        .from('user_stickers')
        .select('*')
        .eq('user_id', req.userId)
        .eq('sticker_id', sticker.id)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        // Incrementar quantidade
        const { data: updated, error: updateError } = await supabase
          .from('user_stickers')
          .update({ quantity: existing.quantity + 1 })
          .eq('id', existing.id)
          .select(`*, sticker:stickers(*)`)
          .single();

        if (updateError) throw updateError;
        results.push({ ...updated, is_new: false });
      } else {
        // Inserir nova figurinha
        const { data: inserted, error: insertError } = await supabase
          .from('user_stickers')
          .insert([{
            user_id: req.userId,
            sticker_id: sticker.id,
            quantity: 1,
            is_pasted: false
          }])
          .select(`*, sticker:stickers(*)`)
          .single();

        if (insertError) throw insertError;
        results.push({ ...inserted, is_new: true });
      }
    }

    res.json({
      message: 'Pacotinho aberto com sucesso!',
      stickers: results
    });
  } catch (err) {
    console.error('Erro ao abrir pacotinho:', err);
    res.status(500).json({ error: 'Erro ao abrir pacotinho' });
  }
});

// PATCH /api/user-stickers/:id/paste — Colar figurinha no álbum
router.patch('/:id/paste', async (req, res) => {
  try {
    const { data: userSticker, error: findError } = await supabase
      .from('user_stickers')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .single();

    if (findError || !userSticker) {
      return res.status(404).json({ error: 'Figurinha não encontrada na sua coleção' });
    }

    if (userSticker.is_pasted) {
      return res.status(400).json({ error: 'Figurinha já está colada no álbum' });
    }

    const { data, error } = await supabase
      .from('user_stickers')
      .update({ is_pasted: true })
      .eq('id', req.params.id)
      .select(`*, sticker:stickers(*)`)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Erro ao colar figurinha:', err);
    res.status(500).json({ error: 'Erro ao colar figurinha' });
  }
});

module.exports = router;
