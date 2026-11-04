import type { Database } from './database';

/** Linha de `customization_item` em texto puro: quem interpreta é o módulo de personalização (BR7.3). */
export type CustomizationRow = {
  itemKey: string;
  kind: string;
  value: string;
  updatedAt: string;
};

type ItemRow = { item_key: string; kind: string; value: string; updated_at: string };

const INSERT =
  'INSERT OR REPLACE INTO customization_item (item_key, kind, value, updated_at) VALUES (?, ?, ?, ?)';

function toRow(row: ItemRow): CustomizationRow {
  return { itemKey: row.item_key, kind: row.kind, value: row.value, updatedAt: row.updated_at };
}

export class CustomizationItemRepo {
  constructor(private readonly db: Database) {}

  all(): CustomizationRow[] {
    return this.db
      .all<ItemRow>('SELECT item_key, kind, value, updated_at FROM customization_item')
      .map(toRow);
  }

  upsert(row: CustomizationRow): void {
    this.db.run(INSERT, [row.itemKey, row.kind, row.value, row.updatedAt]);
  }

  remove(itemKey: string): void {
    this.db.run('DELETE FROM customization_item WHERE item_key = ?', [itemKey]);
  }

  /** Troca todo o conjunto de linhas em uma transação: ou tudo muda, ou nada muda (BR4.3, BR5.1). */
  replaceAll(rows: CustomizationRow[]): void {
    this.db.transaction(() => {
      this.db.run('DELETE FROM customization_item');
      for (const row of rows)
        this.db.run(INSERT, [row.itemKey, row.kind, row.value, row.updatedAt]);
    });
  }
}
