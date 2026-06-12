const express = require('express');
const router = express.Router();
const { supabaseDb: supabase } = require('../services/supabase');
const authMiddleware = require('../middleware/auth');

// GET /api/stickers — Listar todas as figurinhas do catálogo
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('stickers')
      .select('*')
      .order('number', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Erro ao listar figurinhas:', err);
    res.status(500).json({ error: 'Erro ao listar figurinhas' });
  }
});

// GET /api/stickers/:id — Buscar figurinha por ID
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('stickers')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Figurinha não encontrada' });

    res.json(data);
  } catch (err) {
    console.error('Erro ao buscar figurinha:', err);
    res.status(500).json({ error: 'Erro ao buscar figurinha' });
  }
});

// POST /api/stickers — Criar nova figurinha (protegido)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, team, position, country, number, image_url, rarity } = req.body;

    if (!name || !team || !position || !country || !number) {
      return res.status(400).json({ error: 'Campos obrigatórios: name, team, position, country, number' });
    }

    const { data, error } = await supabase
      .from('stickers')
      .insert([{ name, team, position, country, number, image_url, rarity: rarity || 'comum' }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('Erro ao criar figurinha:', err);
    res.status(500).json({ error: 'Erro ao criar figurinha' });
  }
});

// PUT /api/stickers/:id — Atualizar figurinha (protegido)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, team, position, country, number, image_url, rarity } = req.body;

    const { data, error } = await supabase
      .from('stickers')
      .update({ name, team, position, country, number, image_url, rarity })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Figurinha não encontrada' });

    res.json(data);
  } catch (err) {
    console.error('Erro ao atualizar figurinha:', err);
    res.status(500).json({ error: 'Erro ao atualizar figurinha' });
  }
});

// DELETE /api/stickers/:id — Deletar figurinha (protegido)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase
      .from('stickers')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Figurinha deletada com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar figurinha:', err);
    res.status(500).json({ error: 'Erro ao deletar figurinha' });
  }
});

module.exports = router;
