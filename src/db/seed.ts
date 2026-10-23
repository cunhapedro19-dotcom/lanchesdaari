import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  adminUsers,
  establishments,
  mealItems,
  meals,
  menuItems,
  paymentMethods,
} from "@/db/schema";
import { isValidWhatsApp } from "@/lib/format";
import { hashPassword } from "@/lib/password";

/* ---------- Acesso inicial do painel ---------- */

/** Nome de usuário criado junto com a Lanches da Ari (para criar outros, use o script scripts/create-establishment.ts). */
export const DEFAULT_ADMIN_USERNAME = "admin";

/** Senha inicial — o painel avisa até você trocar em Configurações → Meu acesso. */
export const DEFAULT_ADMIN_PASSWORD = "ari-lanches-2026";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = Tx | typeof db;

let seededInThisProcess = false;

/**
 * Cria a Lanches da Ari na primeira execução (banco vazio): dados do negócio,
 * WhatsApp que recebe os pedidos, cardápio real do panfleto, pagamentos e o acesso ao painel.
 */
export async function ensureSeeded(): Promise<void> {
  if (seededInThisProcess) return;

  await db.transaction(async (tx) => {
    // Evita que duas requisições simultâneas criem os dados em duplicidade
    await tx.execute(sql`select pg_advisory_xact_lock(4242)`);
    const existing = await tx.select({ id: establishments.id }).from(establishments).limit(1);
    if (existing.length === 0) {
      const est = await createEstablishment(tx, {
        slug: "lanches-da-ari",
        name: "Lanches da Ari",
        emoji: "🌭",
        logoUrl: "/logo-lanche-da-ari.png",
        description: "Cachorro-quente, batatas e combos — monte seu pedido e envie pelo WhatsApp.",
        // WhatsApp do dono: (21) 98712-2872
        whatsappNumber: "5521987122872",
        adminUsername: DEFAULT_ADMIN_USERNAME,
        adminEmail: null,
        adminPassword: process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD,
      });
      await seedMenuAri(tx, est.id);
      // Nasce PAUSADO: dê uma conferida no cardápio e nos dados do negócio no painel
      // e toque em "REABRIR PEDIDOS" quando estiver tudo pronto.
      await tx.update(establishments).set({ acceptingOrders: false }).where(eq(establishments.id, est.id));
    }
  });

  seededInThisProcess = true;
}

export type NewEstablishmentInput = {
  slug: string;
  name: string;
  emoji?: string;
  description?: string;
  whatsappNumber?: string;
  adminUsername: string;
  adminEmail?: string | null;
  adminPassword: string;
  pickupEnabled?: boolean;
  pickupAddress?: string;
  pickupHours?: string;
  ownDeliveryEnabled?: boolean;
  appDeliveryEnabled?: boolean;
  appDeliveryService?: string;
  heroUrl?: string | null;
  logoUrl?: string | null;
  openingDays?: string;
  openingHours?: string;
  deliveryAreas?: string;
  deliveryNotes?: string;
};

/**
 * Cria um estabelecimento com o usuário administrador e as formas de pagamento padrão.
 * Usado pelo seed e pelo script `scripts/create-establishment.ts`.
 */
export async function createEstablishment(executor: Executor, input: NewEstablishmentInput) {
  const [est] = await executor
    .insert(establishments)
    .values({
      slug: input.slug,
      name: input.name,
      emoji: input.emoji ?? "🌭",
      description: input.description ?? "",
      heroUrl: input.heroUrl ?? null,
      logoUrl: input.logoUrl ?? null,
      whatsappNumber: input.whatsappNumber ?? "",
      // Sem WhatsApp válido o cardápio nasce pausado: só abre depois que o número for cadastrado no painel
      acceptingOrders: isValidWhatsApp(input.whatsappNumber ?? ""),
      openingDays: input.openingDays ?? "",
      openingHours: input.openingHours ?? "",
      pausedMessage: "Voltamos em breve!",
      pickupEnabled: input.pickupEnabled ?? true,
      pickupAddress: input.pickupAddress ?? "",
      pickupHours: input.pickupHours ?? "",
      ownDeliveryEnabled: input.ownDeliveryEnabled ?? true,
      appDeliveryEnabled: input.appDeliveryEnabled ?? false,
      appDeliveryService: input.appDeliveryService ?? "",
      deliveryAreas: input.deliveryAreas ?? "",
      deliveryNotes: input.deliveryNotes ?? "",
    })
    .returning();

  await executor.insert(adminUsers).values({
    establishmentId: est.id,
    username: input.adminUsername.trim().toLowerCase(),
    // E-mail é opcional — dá pra cadastrar depois no painel (Configurações → Meu acesso)
    email: input.adminEmail?.trim().toLowerCase() || null,
    passwordHash: hashPassword(input.adminPassword),
  });

  await executor.insert(paymentMethods).values([
    { establishmentId: est.id, name: "Pix", sortOrder: 1 },
    { establishmentId: est.id, name: "Dinheiro", asksChange: true, sortOrder: 2 },
    { establishmentId: est.id, name: "Cartão", sortOrder: 3 },
  ]);

  return est;
}

/**
 * Cardápio REAL da Ari, lido do panfleto da casa:
 * lanches, batatas fritas, combos, sobremesas, bebida, complementos e molhos.
 *
 * Preços em centavos. Complementos e molhos são de graça e o cliente escolhe
 * todos os que quiser, sem limite — só o molho de alho custa R$ 0,50.
 * A Guaracamp entra inclusa nos combos e no Cachorro de Linguiça + Guaracamp.
 * Para regravar esse cardápio num banco que já está no ar, use supabase/cardapio-real.sql.
 */
async function seedMenuAri(executor: Executor, establishmentId: number) {
  // Complementos do lanche + molhos (grátis: priceCents 0) e proteínas do Combo 1
  const items = await executor
    .insert(menuItems)
    .values([
      // Complementos do lanche
      { establishmentId, category: "side", name: "Milho", priceCents: 0, sortOrder: 1 },
      { establishmentId, category: "side", name: "Ervilha", priceCents: 0, sortOrder: 2 },
      { establishmentId, category: "side", name: "Batata palha", priceCents: 0, sortOrder: 3 },
      { establishmentId, category: "side", name: "Bacon", priceCents: 0, sortOrder: 4 },
      { establishmentId, category: "side", name: "Calabresa", priceCents: 0, sortOrder: 5 },
      { establishmentId, category: "side", name: "Ovo de codorna", priceCents: 0, sortOrder: 6 },
      { establishmentId, category: "side", name: "Presunto", priceCents: 0, sortOrder: 7 },
      { establishmentId, category: "side", name: "Queijo ralado", priceCents: 0, sortOrder: 8 },
      { establishmentId, category: "side", name: "Passas", priceCents: 0, sortOrder: 9 },
      { establishmentId, category: "side", name: "Azeitona", priceCents: 0, sortOrder: 10 },
      // Molhos
      { establishmentId, category: "side", name: "Ketchup", priceCents: 0, sortOrder: 11 },
      { establishmentId, category: "side", name: "Maionese", priceCents: 0, sortOrder: 12 },
      { establishmentId, category: "side", name: "Mostarda", priceCents: 0, sortOrder: 13 },
      { establishmentId, category: "side", name: "Maionese temperada", priceCents: 0, sortOrder: 14 },
      { establishmentId, category: "side", name: "Molho de alho", priceCents: 50, sortOrder: 15 },
      // Proteínas (escolha do Combo 1: salsicha ou linguiça)
      { establishmentId, category: "protein", name: "Salsicha", priceCents: 0, sortOrder: 1 },
      { establishmentId, category: "protein", name: "Linguiça", priceCents: 0, sortOrder: 2 },
      // Bebidas
      { establishmentId, category: "drink", name: "Guaracamp", priceCents: 250, sortOrder: 1 },
    ])
    .returning();

  const byName = new Map(items.map((i) => [i.name, i]));
  const complementos = items.filter((i) => i.category === "side").map((i) => i.id);
  const salsicha = byName.get("Salsicha")!.id;
  const linguica = byName.get("Linguiça")!.id;
  const guaracamp = byName.get("Guaracamp")!.id;
  const maioneseTemperada = byName.get("Maionese temperada")!.id;
  // No Combo Fome Zero a maionese temperada já vem inclusa, então ela sai da lista
  // de escolhas (o banco não aceita o mesmo item com dois papéis no mesmo produto).
  const escolhasFomeZero = complementos.filter((id) => id !== maioneseTemperada);

  const createdMeals = await executor
    .insert(meals)
    .values([
      // Lanches — o cliente escolhe complementos e molhos sem limite (o máximo
      // é a própria quantidade de opções); Guaracamp inclusa quando o nome diz
      { establishmentId, name: "Cachorro de salsicha", category: "Lanches", description: "Pão, salsicha e complementos à escolha.", priceCents: 700, sortOrder: 1, maxChoices: complementos.length },
      { establishmentId, name: "Cachorro de linguiça", category: "Lanches", description: "Pão, linguiça e complementos à escolha.", priceCents: 1000, sortOrder: 2, maxChoices: complementos.length },
      { establishmentId, name: "Cachorro de Linguiça + Guaracamp", category: "Lanches", description: "Pão, linguiça, complementos à escolha e 1 Guaracamp incluso.", priceCents: 1000, sortOrder: 3, maxChoices: complementos.length },
      // Batatas fritas
      { establishmentId, name: "Batata simples", category: "Batatas Fritas", description: "", priceCents: 800, sortOrder: 4, maxChoices: 0 },
      { establishmentId, name: "Batata média", category: "Batatas Fritas", description: "", priceCents: 1500, sortOrder: 5, maxChoices: 0 },
      { establishmentId, name: "Batata grande completa", category: "Batatas Fritas", description: "", priceCents: 2000, sortOrder: 6, maxChoices: 0 },
      { establishmentId, name: "Batata Maluca média", category: "Batatas Fritas", description: "", priceCents: 1750, sortOrder: 7, maxChoices: 0 },
      // Combos
      { establishmentId, name: "Combo Fome Zero", category: "Combos", description: "1 cachorro-quente de salsicha + 1 batata frita simples + 1 Guaracamp + 1 maionese temperada.", priceCents: 1500, sortOrder: 8, maxChoices: escolhasFomeZero.length },
      { establishmentId, name: "Combo 1", category: "Combos", description: "1 cachorro-quente de salsicha ou linguiça + 1 Guaracamp.", priceCents: 1000, sortOrder: 9, maxChoices: complementos.length },
      { establishmentId, name: "Combo 2", category: "Combos", description: "1 Batata Maluca média + 1 Guaracamp.", priceCents: 1750, sortOrder: 10, maxChoices: 0 },
      // Sobremesas
      { establishmentId, name: "Brigadeiro", category: "Sobremesas", description: "", priceCents: 200, sortOrder: 11, maxChoices: 0 },
      { establishmentId, name: "Mousse (Morango ou Maracujá)", category: "Sobremesas", description: "Diga o sabor na observação.", priceCents: 400, sortOrder: 12, maxChoices: 0 },
      { establishmentId, name: "Trufas (sabores diversos)", category: "Sobremesas", description: "Diga o sabor na observação.", priceCents: 500, sortOrder: 13, maxChoices: 0 },
      { establishmentId, name: "Pudim", category: "Sobremesas", description: "", priceCents: 600, sortOrder: 14, maxChoices: 0 },
    ])
    .returning();

  const mealByName = new Map(createdMeals.map((m) => [m.name, m]));
  const dogSalsicha = mealByName.get("Cachorro de salsicha")!.id;
  const dogLinguica = mealByName.get("Cachorro de linguiça")!.id;
  const dogLinguicaGuaracamp = mealByName.get("Cachorro de Linguiça + Guaracamp")!.id;
  const comboFomeZero = mealByName.get("Combo Fome Zero")!.id;
  const combo1 = mealByName.get("Combo 1")!.id;
  const combo2 = mealByName.get("Combo 2")!.id;

  await executor.insert(mealItems).values([
    // Cachorros: complementos e molhos à escolha
    ...complementos.map((itemId) => ({ mealId: dogSalsicha, itemId, role: "choice" as const })),
    ...complementos.map((itemId) => ({ mealId: dogLinguica, itemId, role: "choice" as const })),
    // Cachorro de Linguiça + Guaracamp: complementos e molhos à escolha, Guaracamp inclusa
    ...complementos.map((itemId) => ({ mealId: dogLinguicaGuaracamp, itemId, role: "choice" as const })),
    { mealId: dogLinguicaGuaracamp, itemId: guaracamp, role: "included" as const },
    // Combo Fome Zero: o cachorro leva complementos à escolha e já vem com Guaracamp e maionese temperada
    ...escolhasFomeZero.map((itemId) => ({ mealId: comboFomeZero, itemId, role: "choice" as const })),
    { mealId: comboFomeZero, itemId: guaracamp, role: "included" as const },
    { mealId: comboFomeZero, itemId: maioneseTemperada, role: "included" as const },
    // Combo 1: escolhe salsicha ou linguiça, complementos à escolha e Guaracamp incluso
    { mealId: combo1, itemId: salsicha, role: "protein" as const },
    { mealId: combo1, itemId: linguica, role: "protein" as const },
    ...complementos.map((itemId) => ({ mealId: combo1, itemId, role: "choice" as const })),
    { mealId: combo1, itemId: guaracamp, role: "included" as const },
    // Combo 2: Guaracamp incluso
    { mealId: combo2, itemId: guaracamp, role: "included" as const },
  ]);
}
