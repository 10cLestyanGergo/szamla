import Database from "better-sqlite3";

const db = new Database('./data/database.sqlite');

db.prepare(`
  CREATE TABLE IF NOT EXISTS partners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    tax_number TEXT NOT NULL
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    issuer_id INTEGER NOT NULL,
    buyer_id INTEGER NOT NULL,
    invoice_number TEXT NOT NULL UNIQUE,
    issue_date TEXT NOT NULL,
    completion_date TEXT NOT NULL,
    payment_deadline TEXT NOT NULL,
    total_amount REAL NOT NULL,
    vat_rate REAL NOT NULL,
    FOREIGN KEY (issuer_id) REFERENCES partners(id),
    FOREIGN KEY (buyer_id) REFERENCES partners(id)
  )
`).run();

const now = () => new Date().toISOString();

// Ha nincs vevő vagy kiállító, töltsük fel a mintákat
const partnersCount = db.prepare(`SELECT COUNT(*) AS count FROM partners`).get().count;

if (partnersCount === 0) {
  const insertPartner = db.prepare(`
    INSERT INTO partners (name, address, tax_number) VALUES (?, ?, ?)
  `);

  // A kiállító például egy cég, lehet egy is, de vevők kellenek legalább 3
  const issuerId = insertPartner.run("Minta Kft.", "Budapest, Fő utca 1.", "12345678-1-41").lastInsertRowid;

  // 3 vevő
  const buyers = [
    {name: "Vevő Egy Kft.", address: "Budapest, Váci út 10.", tax_number: "11111111-1-11"},
    {name: "Vevő Kettő Bt.", address: "Debrecen, Piac tér 2.", tax_number: "22222222-2-22"},
    {name: "Vevő Három Zrt.", address: "Szeged, Tisza Lajos krt. 5.", tax_number: "33333333-3-33"}
  ];

  const buyerIds = buyers.map(b => insertPartner.run(b.name, b.address, b.tax_number).lastInsertRowid);

  // Számlák feltöltése vevőnként 3-3 számla
  const insertInvoice = db.prepare(`
    INSERT INTO invoices (
      issuer_id, buyer_id, invoice_number, issue_date, completion_date,
      payment_deadline, total_amount, vat_rate
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const baseDate = new Date("2025-01-01T00:00:00Z");

  for (let i = 0; i < buyerIds.length; i++) {
    const buyerId = buyerIds[i];
    for (let j = 1; j <= 3; j++) {
      const issueDate = new Date(baseDate.getTime() + (i*3 + j) * 86400000);
      const completionDate = new Date(issueDate.getTime() + 2 * 86400000);
      const paymentDeadline = new Date(issueDate.getTime() + 15 * 86400000);
      const totalAmount = 10000 + (i+j)*1000;
      const vatRate = 27; // Magyarország ÁFA 27%

      insertInvoice.run(
        issuerId,
        buyerId,
        `SZLA-${i+1}00${j}`,
        issueDate.toISOString().substring(0,10),
        completionDate.toISOString().substring(0,10),
        paymentDeadline.toISOString().substring(0,10),
        totalAmount,
        vatRate
      );
    }
  }
}

export const getAllInvoices = () => 
  db.prepare(`
    SELECT invoices.*, 
           i.name as issuer_name, i.address as issuer_address, i.tax_number as issuer_tax,
           b.name as buyer_name, b.address as buyer_address, b.tax_number as buyer_tax
    FROM invoices
    JOIN partners i ON invoices.issuer_id = i.id
    JOIN partners b ON invoices.buyer_id = b.id
    ORDER BY invoices.issue_date DESC
  `).all();

export const getInvoiceById = (id) =>
  db.prepare(`
    SELECT invoices.*, 
           i.name as issuer_name, i.address as issuer_address, i.tax_number as issuer_tax,
           b.name as buyer_name, b.address as buyer_address, b.tax_number as buyer_tax
    FROM invoices
    JOIN partners i ON invoices.issuer_id = i.id
    JOIN partners b ON invoices.buyer_id = b.id
    WHERE invoices.id = ?
  `).get(id);

export const createInvoice = ({
  issuer_id, buyer_id, invoice_number, issue_date,
  completion_date, payment_deadline, total_amount, vat_rate
}) => {
  return db.prepare(`
    INSERT INTO invoices (
      issuer_id, buyer_id, invoice_number, issue_date,
      completion_date, payment_deadline, total_amount, vat_rate
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    issuer_id, buyer_id, invoice_number, issue_date,
    completion_date, payment_deadline, total_amount, vat_rate
  );
};

export const updateInvoice = (id, {
  issuer_id, buyer_id, invoice_number, issue_date,
  completion_date, payment_deadline, total_amount, vat_rate
}) => {
  return db.prepare(`
    UPDATE invoices SET
      issuer_id = ?, buyer_id = ?, invoice_number = ?, issue_date = ?,
      completion_date = ?, payment_deadline = ?, total_amount = ?, vat_rate = ?
    WHERE id = ?
  `).run(
    issuer_id, buyer_id, invoice_number, issue_date,
    completion_date, payment_deadline, total_amount, vat_rate,
    id
  );
};

export const deleteInvoice = (id) => 
  db.prepare(`DELETE FROM invoices WHERE id = ?`).run(id);

export const getAllPartners = () =>
  db.prepare(`SELECT * FROM partners ORDER BY name`).all();