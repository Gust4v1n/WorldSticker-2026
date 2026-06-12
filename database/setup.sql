-- =============================================
-- ÁLBUM DE FIGURINHAS VIRTUAL — Setup do Banco
-- Execute este script no SQL Editor do Supabase
-- =============================================

-- 1. Tabela PROFILES (estende auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela STICKERS (catálogo de figurinhas)
CREATE TABLE IF NOT EXISTS public.stickers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    team TEXT NOT NULL,
    position TEXT NOT NULL,
    country TEXT NOT NULL,
    number INT UNIQUE NOT NULL,
    image_url TEXT,
    rarity TEXT DEFAULT 'comum' CHECK (rarity IN ('comum', 'raro', 'lendário')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela USER_STICKERS (coleção do usuário)
CREATE TABLE IF NOT EXISTS public.user_stickers (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    sticker_id INT NOT NULL REFERENCES public.stickers(id) ON DELETE CASCADE,
    quantity INT DEFAULT 1 CHECK (quantity >= 0),
    is_pasted BOOLEAN DEFAULT false,
    obtained_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, sticker_id)
);

-- 4. Tabela TRADES (trocas entre usuários)
CREATE TABLE IF NOT EXISTS public.trades (
    id SERIAL PRIMARY KEY,
    proposer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    offered_sticker_id INT NOT NULL REFERENCES public.stickers(id),
    wanted_sticker_id INT NOT NULL REFERENCES public.stickers(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- HABILITAR RLS EM TODAS AS TABELAS
-- =============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- =============================================
-- POLÍTICAS RLS — PROFILES
-- =============================================
CREATE POLICY "Perfis visíveis por todos"
    ON public.profiles FOR SELECT
    USING (true);

CREATE POLICY "Usuário cria próprio perfil"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Usuário edita próprio perfil"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- =============================================
-- POLÍTICAS RLS — STICKERS (catálogo — leitura pública)
-- =============================================
CREATE POLICY "Figurinhas visíveis por todos"
    ON public.stickers FOR SELECT
    USING (true);

-- =============================================
-- POLÍTICAS RLS — USER_STICKERS
-- =============================================
CREATE POLICY "Ver próprias figurinhas"
    ON public.user_stickers FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Inserir próprias figurinhas"
    ON public.user_stickers FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Atualizar próprias figurinhas"
    ON public.user_stickers FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Deletar próprias figurinhas"
    ON public.user_stickers FOR DELETE
    USING (auth.uid() = user_id);

-- =============================================
-- POLÍTICAS RLS — TRADES
-- =============================================
CREATE POLICY "Ver trocas públicas ou próprias"
    ON public.trades FOR SELECT
    USING (status = 'pending' OR auth.uid() IN (proposer_id, receiver_id));

CREATE POLICY "Criar troca"
    ON public.trades FOR INSERT
    WITH CHECK (auth.uid() = proposer_id);

CREATE POLICY "Atualizar troca se envolvido"
    ON public.trades FOR UPDATE
    USING (auth.uid() IN (proposer_id, receiver_id));

CREATE POLICY "Deletar própria troca"
    ON public.trades FOR DELETE
    USING (auth.uid() = proposer_id);

-- =============================================
-- HABILITAR REALTIME na tabela trades
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.trades;

-- =============================================
-- CRIAR BUCKET DE STORAGE PARA IMAGENS
-- =============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('sticker-images', 'sticker-images', true)
ON CONFLICT (id) DO NOTHING;

-- Política de leitura pública para o bucket
CREATE POLICY "Imagens de figurinhas são públicas"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'sticker-images');

-- =============================================
-- DADOS INICIAIS — 30 figurinhas de jogadores
-- =============================================
INSERT INTO public.stickers (name, team, position, country, number, rarity) VALUES
    ('Lionel Messi', 'Inter Miami', 'Atacante', 'Argentina', 1, 'lendário'),
    ('Cristiano Ronaldo', 'Al-Nassr', 'Atacante', 'Portugal', 2, 'lendário'),
    ('Neymar Jr', 'Santos', 'Atacante', 'Brasil', 3, 'lendário'),
    ('Kylian Mbappé', 'Real Madrid', 'Atacante', 'França', 4, 'lendário'),
    ('Erling Haaland', 'Manchester City', 'Atacante', 'Noruega', 5, 'raro'),
    ('Vinícius Jr', 'Real Madrid', 'Atacante', 'Brasil', 6, 'raro'),
    ('Jude Bellingham', 'Real Madrid', 'Meia', 'Inglaterra', 7, 'raro'),
    ('Rodri', 'Manchester City', 'Volante', 'Espanha', 8, 'raro'),
    ('Lamine Yamal', 'Barcelona', 'Atacante', 'Espanha', 9, 'raro'),
    ('Florian Wirtz', 'B. Leverkusen', 'Meia', 'Alemanha', 10, 'raro'),
    ('Mohamed Salah', 'Liverpool', 'Atacante', 'Egito', 11, 'comum'),
    ('Kevin De Bruyne', 'Manchester City', 'Meia', 'Bélgica', 12, 'comum'),
    ('Robert Lewandowski', 'Barcelona', 'Atacante', 'Polônia', 13, 'comum'),
    ('Bukayo Saka', 'Arsenal', 'Atacante', 'Inglaterra', 14, 'comum'),
    ('Phil Foden', 'Manchester City', 'Meia', 'Inglaterra', 15, 'comum'),
    ('Bernardo Silva', 'Manchester City', 'Meia', 'Portugal', 16, 'comum'),
    ('Raphinha', 'Barcelona', 'Atacante', 'Brasil', 17, 'comum'),
    ('Alisson Becker', 'Liverpool', 'Goleiro', 'Brasil', 18, 'comum'),
    ('Thibaut Courtois', 'Real Madrid', 'Goleiro', 'Bélgica', 19, 'comum'),
    ('Virgil van Dijk', 'Liverpool', 'Zagueiro', 'Holanda', 20, 'comum'),
    ('Rúben Dias', 'Manchester City', 'Zagueiro', 'Portugal', 21, 'comum'),
    ('Antonio Rüdiger', 'Real Madrid', 'Zagueiro', 'Alemanha', 22, 'comum'),
    ('Trent Alexander-Arnold', 'Real Madrid', 'Lateral', 'Inglaterra', 23, 'comum'),
    ('Achraf Hakimi', 'PSG', 'Lateral', 'Marrocos', 24, 'comum'),
    ('Federico Valverde', 'Real Madrid', 'Meia', 'Uruguai', 25, 'comum'),
    ('Bruno Fernandes', 'Manchester United', 'Meia', 'Portugal', 26, 'comum'),
    ('Declan Rice', 'Arsenal', 'Volante', 'Inglaterra', 27, 'comum'),
    ('Jamal Musiala', 'Bayern Munich', 'Meia', 'Alemanha', 28, 'raro'),
    ('Pedri', 'Barcelona', 'Meia', 'Espanha', 29, 'raro'),
    ('Endrick', 'Real Madrid', 'Atacante', 'Brasil', 30, 'raro');
