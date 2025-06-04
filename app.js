import express from "express";
import * as db from './util/database.js';

import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 8080;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Számlák listázása
app.get("/invoices", (req, res) => {
  try {
    const invoices = db.getAllInvoices();
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Számla lekérése ID alapján
app.get("/invoices/:id", (req, res) => {
  try {
    const invoice = db.getInvoiceById(req.params.id);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Új számla létrehozása
app.post("/invoices", (req, res) => {
  const {
    issuer_id, buyer_id, invoice_number, issue_date,
    completion_date, payment_deadline, total_amount, vat_rate
  } = req.body;

  if (!issuer_id || !buyer_id || !invoice_number || !issue_date ||
      !completion_date || !payment_deadline || !total_amount || !vat_rate) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const result = db.createInvoice({
      issuer_id, buyer_id, invoice_number, issue_date,
      completion_date, payment_deadline, total_amount, vat_rate
    });
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// Számla törlése
app.delete("/invoices/:id", (req, res) => {
  try {
    const result = db.deleteInvoice(req.params.id);
    if (result.changes === 0) return res.status(404).json({ message: "Invoice not found" });
    res.json({ message: "Invoice deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Partnerek lekérése (pl. vevők és kiállítók listája)
app.get("/partners", (req, res) => {
  try {
    const partners = db.getAllPartners();
    res.json(partners);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Frontend kiszolgálása
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
