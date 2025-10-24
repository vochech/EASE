// app/api/supabase-proxy/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { ALLOWED_TABLES, type AllowedTable, type AllowedAction } from "@/lib/proxyWhitelist";

// ----- Filtry / typy -----
const FilterOp = z.enum([
  "eq","neq","gt","gte","lt","lte",
  "like","ilike","in","is","contains","containedBy","overlaps"
]);
type Op = z.infer<typeof FilterOp>;
type FilterTuple = [Op, string, any];

// ----- Table enum z whitelistu -----
const TABLE_KEYS = Object.keys(ALLOWED_TABLES) as AllowedTable[];
const ALLOWED_TABLE_ENUM = z.enum([TABLE_KEYS[0], ...TABLE_KEYS.slice(1)] as [AllowedTable, ...AllowedTable[]]);

// ----- Payload (objekt nebo pole objektů) -----
const JsonRecord = z.object({}).catchall(z.unknown()); // libovolné klíče i hodnoty
const PayloadSchema = z.union([JsonRecord, z.array(JsonRecord)]);


// ----- Request schema -----
const reqSchema = z.object({
  action: z.enum(["select","insert","update","delete"]),
  table: ALLOWED_TABLE_ENUM,
  payload: PayloadSchema.optional(),                       // pro insert/update
  filters: z.array(z.tuple([FilterOp, z.string(), z.any()])).optional(),
  columns: z.string().optional(),                          // např. "id,name,created_at"
  range: z.tuple([z.number(), z.number()]).optional(),     // [from, to]
  useServiceRole: z.boolean().optional().default(false),
});

function assertAllowed(table: AllowedTable, action: AllowedAction) {
  const allowed = ALLOWED_TABLES[table] as readonly string[];
  if (!allowed.includes(action)) {
    throw new Error(`Action not allowed: ${table}.${action}`);
  }
}

export async function POST(req: Request) {
  try {
    // Auth tajemstvím (server-only)
    if (req.headers.get("x-proxy-secret") !== process.env.PROXY_SHARED_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = reqSchema.parse(body);
    const { action, table, payload, filters, columns, range, useServiceRole } = parsed;

    assertAllowed(table, action as AllowedAction);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      useServiceRole ? process.env.SUPABASE_SERVICE_ROLE_KEY! : process.env.SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );

    let q: any = supabase.from(table as string);
    const filtersArr = (filters ?? []) as FilterTuple[];

    // SELECT
    if (action === "select") {
      let sel: any = q.select(columns ?? "*");
      filtersArr.forEach(([op, col, val]) => {
        sel = sel[op](col, val);
      });
      if (range) sel = sel.range(range[0], range[1]);

      const { data, error } = await sel;
      if (error) throw error;
      return NextResponse.json({ data });
    }

    // INSERT
    if (action === "insert") {
      const { data, error } = await q.insert(payload!).select();
      if (error) throw error;
      return NextResponse.json({ data });
    }

    // UPDATE
    if (action === "update") {
      let upd: any = q.update(payload!);
      filtersArr.forEach(([op, col, val]) => {
        upd = upd[op](col, val);
      });
      const { data, error } = await upd.select();
      if (error) throw error;
      return NextResponse.json({ data });
    }

    // DELETE
    if (action === "delete") {
      let del: any = q.delete();
      filtersArr.forEach(([op, col, val]) => {
        del = del[op](col, val);
      });
      const { data, error } = await del.select();
      if (error) throw error;
      return NextResponse.json({ data });
    }

    return NextResponse.json({ error: "Unsupported" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Server error" }, { status: 400 });
  }
}
