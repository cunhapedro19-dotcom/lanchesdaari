-- ═══════════════════════════════════════════════════════════════════════
-- Lanches da Ari — cardápio REAL (lido do panfleto da casa)
--
-- Como usar: Supabase → SQL Editor → New query → cole TUDO daqui → Run.
--
-- O que ele faz:
--   1) Atualiza a frase do negócio;
--   2) Apaga o cardápio atual da Lanches da Ari (produtos, complementos e bebidas);
--   3) Insere o cardápio real: 13 produtos + 14 complementos/molhos + 2 proteínas
--      + 1 bebida, com os vínculos de composição (escolhas, inclusos e proteína).
--
-- Pode rodar de novo sem duplicar: ele substitui o cardápio atual por este.
-- ATENÇÃO: ele apaga qualquer produto/complemento/bebida que você tenha cadastrado
-- no painel — é um "voltar pro cardápio do panfleto".
--
-- Fica de fora (o panfleto não mostra):
--   - dias de funcionamento e endereço de retirada — Configurações do painel.
-- ═══════════════════════════════════════════════════════════════════════

begin;

-- 1) Dados do negócio
update establishments set
  description = 'Cachorro-quente, batatas e combos — monte seu pedido e envie pelo WhatsApp.',
  updated_at  = now()
where slug = 'lanches-da-ari';

-- 2) Limpa o cardápio atual (produtos, complementos e bebidas da Lanches da Ari)
delete from meal_items
  where meal_id in (
    select id from meals
    where establishment_id = (select id from establishments where slug = 'lanches-da-ari')
  );
delete from meals
  where establishment_id = (select id from establishments where slug = 'lanches-da-ari');
delete from menu_items
  where establishment_id = (select id from establishments where slug = 'lanches-da-ari');

-- 3) Complementos do lanche + molhos (grátis, o cliente escolhe ao montar),
--    proteínas do Combo 1 e bebidas
insert into menu_items (establishment_id, category, name, price_cents, sort_order)
select e.id, x.category, x.name, x.price, x.ord
from establishments e, (values
  ('side',   'Milho',                0, 1),
  ('side',   'Ervilha',              0, 2),
  ('side',   'Batata palha',         0, 3),
  ('side',   'Bacon',                0, 4),
  ('side',   'Calabresa',            0, 5),
  ('side',   'Ovo de codorna',       0, 6),
  ('side',   'Presunto',             0, 7),
  ('side',   'Queijo ralado',        0, 8),
  ('side',   'Passas',               0, 9),
  ('side',   'Azeitona',             0, 10),
  ('side',   'Ketchup',              0, 11),
  ('side',   'Maionese',             0, 12),
  ('side',   'Mostarda',             0, 13),
  ('side',   'Maionese temperada',   0, 14),
  ('protein', 'Salsicha',            0, 1),
  ('protein', 'Linguiça',            0, 2),
  ('drink',  'Guaracamp',          250, 1)
) as x(category, name, price, ord)
where e.slug = 'lanches-da-ari';

-- 4) Produtos do cardápio real, agrupados pelas seções do panfleto
--    (max_choices 0 = produto simples; 14 = os complementos/molhos todos à escolha)
insert into meals (establishment_id, name, category, description, price_cents,
                   sort_order, max_choices, allow_extras, allow_notes)
select e.id, m.name, m.category, m.description, m.price,
       m.ord, m.maxchoices, true, true
from establishments e, (values
  -- LANCHES
  ('Cachorro de salsicha', 'Lanches', 'Pão, salsicha e complementos à escolha.',        700,  1, 14),
  ('Cachorro de linguiça', 'Lanches', 'Pão, linguiça e complementos à escolha.',       1000,  2, 14),
  -- BATATAS FRITAS
  ('Batata simples',          'Batatas Fritas', '',  800, 3, 0),
  ('Batata média',            'Batatas Fritas', '', 1500, 4, 0),
  ('Batata grande completa',  'Batatas Fritas', '', 2000, 5, 0),
  ('Batata Maluca média',     'Batatas Fritas', '', 1750, 6, 0),
  -- COMBOS
  ('Combo Fome Zero', 'Combos', '1 cachorro-quente de salsicha + 1 batata frita simples + 1 Guaracamp + 1 maionese temperada.', 1500, 7, 14),
  ('Combo 1',         'Combos', '1 cachorro-quente de salsicha ou linguiça + 1 Guaracamp.',                                     1000, 8, 14),
  ('Combo 2',         'Combos', '1 Batata Maluca média + 1 Guaracamp.',                                                         1750, 9, 0),
  -- SOBREMESAS
  ('Brigadeiro',                    'Sobremesas', '',                               200, 10, 0),
  ('Mousse (Morango ou Maracujá)',  'Sobremesas', 'Diga o sabor na observação.',    400, 11, 0),
  ('Trufas (sabores diversos)',     'Sobremesas', 'Diga o sabor na observação.',    500, 12, 0),
  ('Pudim',                         'Sobremesas', '',                               600, 13, 0)
) as m(name, category, description, price, ord, maxchoices)
where e.slug = 'lanches-da-ari';

-- 5) Composição de cada produto (o que o cliente escolhe e o que já vem incluso)
with
  est as (select id from establishments where slug = 'lanches-da-ari'),
  itens as (select id, name from menu_items where establishment_id = (select id from est)),
  produtos as (select id, name from meals where establishment_id = (select id from est)),
  vinculos as (
    select p.id as meal_id, i.id as item_id, v.role
    from (values
      ('Cachorro de salsicha', 'Milho',              'choice'),
      ('Cachorro de salsicha', 'Ervilha',            'choice'),
      ('Cachorro de salsicha', 'Batata palha',       'choice'),
      ('Cachorro de salsicha', 'Bacon',              'choice'),
      ('Cachorro de salsicha', 'Calabresa',          'choice'),
      ('Cachorro de salsicha', 'Ovo de codorna',     'choice'),
      ('Cachorro de salsicha', 'Presunto',           'choice'),
      ('Cachorro de salsicha', 'Queijo ralado',      'choice'),
      ('Cachorro de salsicha', 'Passas',             'choice'),
      ('Cachorro de salsicha', 'Azeitona',           'choice'),
      ('Cachorro de salsicha', 'Ketchup',            'choice'),
      ('Cachorro de salsicha', 'Maionese',           'choice'),
      ('Cachorro de salsicha', 'Mostarda',           'choice'),
      ('Cachorro de salsicha', 'Maionese temperada', 'choice'),
      ('Cachorro de linguiça', 'Milho',              'choice'),
      ('Cachorro de linguiça', 'Ervilha',            'choice'),
      ('Cachorro de linguiça', 'Batata palha',       'choice'),
      ('Cachorro de linguiça', 'Bacon',              'choice'),
      ('Cachorro de linguiça', 'Calabresa',          'choice'),
      ('Cachorro de linguiça', 'Ovo de codorna',     'choice'),
      ('Cachorro de linguiça', 'Presunto',           'choice'),
      ('Cachorro de linguiça', 'Queijo ralado',      'choice'),
      ('Cachorro de linguiça', 'Passas',             'choice'),
      ('Cachorro de linguiça', 'Azeitona',           'choice'),
      ('Cachorro de linguiça', 'Ketchup',            'choice'),
      ('Cachorro de linguiça', 'Maionese',           'choice'),
      ('Cachorro de linguiça', 'Mostarda',           'choice'),
      ('Cachorro de linguiça', 'Maionese temperada', 'choice'),
      ('Combo Fome Zero',      'Milho',              'choice'),
      ('Combo Fome Zero',      'Ervilha',            'choice'),
      ('Combo Fome Zero',      'Batata palha',       'choice'),
      ('Combo Fome Zero',      'Bacon',              'choice'),
      ('Combo Fome Zero',      'Calabresa',          'choice'),
      ('Combo Fome Zero',      'Ovo de codorna',     'choice'),
      ('Combo Fome Zero',      'Presunto',           'choice'),
      ('Combo Fome Zero',      'Queijo ralado',      'choice'),
      ('Combo Fome Zero',      'Passas',             'choice'),
      ('Combo Fome Zero',      'Azeitona',           'choice'),
      ('Combo Fome Zero',      'Ketchup',            'choice'),
      ('Combo Fome Zero',      'Maionese',           'choice'),
      ('Combo Fome Zero',      'Mostarda',           'choice'),
      ('Combo Fome Zero',      'Maionese temperada', 'choice'),
      ('Combo Fome Zero',      'Guaracamp',          'included'),
      ('Combo 1',              'Salsicha',           'protein'),
      ('Combo 1',              'Linguiça',           'protein'),
      ('Combo 1',              'Milho',              'choice'),
      ('Combo 1',              'Ervilha',            'choice'),
      ('Combo 1',              'Batata palha',       'choice'),
      ('Combo 1',              'Bacon',              'choice'),
      ('Combo 1',              'Calabresa',          'choice'),
      ('Combo 1',              'Ovo de codorna',     'choice'),
      ('Combo 1',              'Presunto',           'choice'),
      ('Combo 1',              'Queijo ralado',      'choice'),
      ('Combo 1',              'Passas',             'choice'),
      ('Combo 1',              'Azeitona',           'choice'),
      ('Combo 1',              'Ketchup',            'choice'),
      ('Combo 1',              'Maionese',           'choice'),
      ('Combo 1',              'Mostarda',           'choice'),
      ('Combo 1',              'Maionese temperada', 'choice'),
      ('Combo 1',              'Guaracamp',          'included'),
      ('Combo 2',              'Guaracamp',          'included')
    ) as v(produto, item, role)
    join produtos p on p.name = v.produto
    join itens i on i.name = v.item
  )
insert into meal_items (meal_id, item_id, role)
select meal_id, item_id, role from vinculos;

commit;

-- Confere o resultado: deve listar os 13 produtos com os preços
select category, name, price_cents / 100.0 as preco
from meals
where establishment_id = (select id from establishments where slug = 'lanches-da-ari')
order by category, sort_order;

-- ...e os 17 complementos + proteínas + bebidas
select category, name, price_cents / 100.0 as preco
from menu_items
where establishment_id = (select id from establishments where slug = 'lanches-da-ari')
order by category, sort_order;
