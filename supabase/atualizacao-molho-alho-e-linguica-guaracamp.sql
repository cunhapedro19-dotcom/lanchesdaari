-- ═══════════════════════════════════════════════════════════════════════
-- Lanches da Ari — atualização do cardápio no ar (rode UMA vez)
--
-- Como usar: Supabase → SQL Editor → New query → cole TUDO daqui → Run.
--
-- Não apaga nada (fotos e ajustes do painel ficam intactos) e pode rodar
-- de novo sem duplicar. O que muda:
--
--   1) Molho de alho (R$ 0,50) entra nos molhos à escolha dos lanches;
--   2) Novo produto nos Lanches: Cachorro de Linguiça + Guaracamp (R$ 10,00,
--      com 1 Guaracamp inclusa) — a 3ª posição da seção;
--   3) Sem limite de escolha: o máximo passa a ser a quantidade de opções
--      de cada produto (dá pra marcar todos).
-- ═══════════════════════════════════════════════════════════════════════

begin;

-- 1) Molho de alho
insert into menu_items (establishment_id, category, name, price_cents, sort_order)
select e.id, 'side', 'Molho de alho', 50, 15
from establishments e
where e.slug = 'lanches-da-ari'
  and not exists (
    select 1 from menu_items i
    where i.establishment_id = e.id and i.name = 'Molho de alho'
  );

-- ...entra como escolha nos lanches e combos que já têm complementos
insert into meal_items (meal_id, item_id, role)
select m.id, i.id, 'choice'
from meals m
join establishments e on e.id = m.establishment_id
join menu_items i on i.establishment_id = e.id and i.name = 'Molho de alho'
where e.slug = 'lanches-da-ari'
  and m.name in ('Cachorro de salsicha', 'Cachorro de linguiça', 'Combo Fome Zero', 'Combo 1')
  and not exists (select 1 from meal_items mi where mi.meal_id = m.id and mi.item_id = i.id);

-- 2) Novo produto: abre a 3ª posição dos Lanches e empurra o resto pra baixo
update meals set sort_order = sort_order + 1
where establishment_id = (select id from establishments where slug = 'lanches-da-ari')
  and sort_order >= 3
  and not exists (
    select 1 from meals m2
    where m2.establishment_id = (select id from establishments where slug = 'lanches-da-ari')
      and m2.name = 'Cachorro de Linguiça + Guaracamp'
  );

insert into meals (establishment_id, name, category, description, price_cents,
                   sort_order, max_choices, allow_extras, allow_notes)
select e.id, 'Cachorro de Linguiça + Guaracamp', 'Lanches',
       'Pão, linguiça, complementos à escolha e 1 Guaracamp incluso.', 1000, 3, 15, true, true
from establishments e
where e.slug = 'lanches-da-ari'
  and not exists (
    select 1 from meals m
    where m.establishment_id = e.id and m.name = 'Cachorro de Linguiça + Guaracamp'
  );

-- Complementos e molhos à escolha no novo produto
insert into meal_items (meal_id, item_id, role)
select m.id, i.id, 'choice'
from meals m
join establishments e on e.id = m.establishment_id
join menu_items i on i.establishment_id = e.id and i.category = 'side'
where e.slug = 'lanches-da-ari'
  and m.name = 'Cachorro de Linguiça + Guaracamp'
  and not exists (select 1 from meal_items mi where mi.meal_id = m.id and mi.item_id = i.id);

-- Guaracamp inclusa no novo produto
insert into meal_items (meal_id, item_id, role)
select m.id, i.id, 'included'
from meals m
join establishments e on e.id = m.establishment_id
join menu_items i on i.establishment_id = e.id and i.name = 'Guaracamp'
where e.slug = 'lanches-da-ari'
  and m.name = 'Cachorro de Linguiça + Guaracamp'
  and not exists (select 1 from meal_items mi where mi.meal_id = m.id and mi.item_id = i.id);

-- 3) Sem limite: o máximo de escolhas passa a ser a quantidade de opções
--    de cada produto (produtos sem escolha, como as batatas, ficam como estão)
update meals set max_choices = (
  select count(*) from meal_items mi
  where mi.meal_id = meals.id and mi.role = 'choice'
)
where establishment_id = (select id from establishments where slug = 'lanches-da-ari')
  and max_choices > 0;

commit;

-- Conferência: deve listar 14 produtos, com o novo na 3ª posição
select sort_order, name, price_cents / 100.0 as preco, max_choices
from meals
where establishment_id = (select id from establishments where slug = 'lanches-da-ari')
order by sort_order;

-- ...e 15 molhos/complementos, com o molho de alho a R$ 0,50 no fim
select sort_order, name, price_cents / 100.0 as preco
from menu_items
where establishment_id = (select id from establishments where slug = 'lanches-da-ari')
  and category = 'side'
order by sort_order;
