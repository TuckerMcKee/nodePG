process.env.NODE_ENV = "test";
const request = require("supertest");
const app = require("./app.js");
const db = require("./db.js");

//these tests were written with assistance from ChatGPT

// Seed test database before running tests
beforeEach(async () => {
  await db.query("DELETE FROM companies");
  await db.query("DELETE FROM invoices");
  await db.query("DELETE FROM comp_industries");
  await db.query("DELETE FROM industries");

  await db.query(`
    INSERT INTO companies (code, name, description)
    VALUES 
      ('apple', 'Apple Computer', 'Maker of OSX.'),
      ('ibm', 'IBM', 'Big blue.')
  `);

  await db.query(`
    INSERT INTO invoices (comp_code, amt, paid, paid_date)
    VALUES 
      ('apple', 100, false, null),
      ('apple', 200, true, '2022-01-01'),
      ('ibm', 400, false, null)
  `);

  await db.query(`
    INSERT INTO industries (code, industry)
    VALUES 
      ('tech', 'Technology'),
      ('finance', 'Financial Services')
  `);

  await db.query(`
    INSERT INTO comp_industries (comp_code, ind_code)
    VALUES 
      ('apple', 'tech'),
      ('ibm', 'tech'),
      ('ibm', 'finance')
  `);
});

// Clean up after tests
afterAll(async () => {
  await db.end();
});

describe("GET /companies", () => {
  test("Gets a list of all companies", async () => {
    const res = await request(app).get("/companies");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      companies: [
        { code: "apple", name: "Apple Computer", description: "Maker of OSX." },
        { code: "ibm", name: "IBM", description: "Big blue." },
      ],
    });
  });
});

describe("GET /companies/:code", () => {
  test("Gets details of a specific company", async () => {
    const res = await request(app).get("/companies/apple");
    expect(res.statusCode).toBe(200);
    console.log(res.body)
    expect(res.body).toEqual({
      company: {
        code: "apple",
        name: "Apple Computer",
        description: "Maker of OSX.",
        invoices: expect.any(Array),
        industries: expect.any(Array),
      },
    });
  });

  test("Responds with 404 if company not found", async () => {
    const res = await request(app).get("/companies/unknown");
    expect(res.statusCode).toBe(404);
  });
});

describe("POST /companies", () => {
  test("Creates a new company", async () => {
    const res = await request(app)
      .post("/companies")
      .send({ name: "NewCo", description: "New Company" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      company: { code: "newco", name: "NewCo", description: "New Company" },
    });

    // Check if new company exists in database
    const dbRes = await db.query("SELECT * FROM companies WHERE code='newco'");
    expect(dbRes.rows.length).toBe(1);
  });
});

describe("PUT /companies/:code", () => {
  test("Updates an existing company", async () => {
    const res = await request(app)
      .put("/companies/apple")
      .send({ name: "Apple Inc.", description: "Maker of iPhones." });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      company: [{ code: "apple", name: "Apple Inc.", description: "Maker of iPhones." }],
    });
  });

  test("Responds with 404 if company not found", async () => {
    const res = await request(app)
      .put("/companies/unknown")
      .send({ name: "Unknown Co", description: "Does not exist." });
    expect(res.statusCode).toBe(404);
  });
});

describe("DELETE /companies/:code", () => {
  test("Deletes a company", async () => {
    const res = await request(app).delete("/companies/apple");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: "deleted" });

    // Check if company is removed from the database
    const dbRes = await db.query("SELECT * FROM companies WHERE code='apple'");
    expect(dbRes.rows.length).toBe(0);
  });

  test("Responds with 404 if company not found", async () => {
    const res = await request(app).delete("/companies/unknown");
    expect(res.statusCode).toBe(404);
  });
});

describe("GET /industries", () => {
    test("Gets a list of industries with associated companies", async () => {
      const res = await request(app).get("/industries");
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        industries: expect.arrayContaining([
          { industry: "Technology", comp_codes: expect.arrayContaining(["apple", "ibm"]) },
          { industry: "Financial Services", comp_codes: expect.arrayContaining(["ibm"]) },
        ]),
      });
    });
  });
  
  describe("POST /industries", () => {
    test("Creates a new industry", async () => {
      const res = await request(app)
        .post("/industries")
        .send({ code: "health", industry: "Healthcare" });
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        industry: { code: "health", industry: "Healthcare" },
      });
  
      // Check if the new industry exists in the database
      const dbRes = await db.query("SELECT * FROM industries WHERE code='health'");
      expect(dbRes.rows.length).toBe(1);
    });
  
    test("Fails to create an industry with missing fields", async () => {
      const res = await request(app).post("/industries").send({ industry: "Healthcare" });
      expect(res.statusCode).toBe(500); 
    });
  });
  
  describe("POST /industries/comp_industries", () => {
    test("Associates a company with an industry", async () => {
      const res = await request(app)
        .post("/industries/comp_industries")
        .send({ comp_code: "apple", ind_code: "finance" });
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        comp_industry: { id: expect.any(Number), comp_code: "apple", ind_code: "finance" },
      });
  
      // Check if the association exists in the database
      const dbRes = await db.query(
        "SELECT * FROM comp_industries WHERE comp_code='apple' AND ind_code='finance'"
      );
      expect(dbRes.rows.length).toBe(1);
  });

  test("Fails to associate a company with a non-existent industry", async () => {
    const res = await request(app)
      .post("/industries/comp_industries")
      .send({ comp_code: "apple", ind_code: "nonexistent" });
    expect(res.statusCode).toBe(500); 
  });

  test("Fails to associate a non-existent company with an industry", async () => {
    const res = await request(app)
      .post("/industries/comp_industries")
      .send({ comp_code: "nonexistent", ind_code: "tech" });
    expect(res.statusCode).toBe(500); 
  });
});

describe("GET /invoices", () => {
    test("Gets a list of all invoices", async () => {
      const res = await request(app).get("/invoices");
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        invoices: expect.arrayContaining([
          { id: expect.any(Number), comp_code: "apple" },
          { id: expect.any(Number), comp_code: "ibm" },
        ]),
      });
    });
  });
  
  describe("GET /invoices/:id", () => {
    test("Gets details of a specific invoice", async () => {
      const invoiceRes = await db.query("SELECT id FROM invoices LIMIT 1");
      const invoiceId = invoiceRes.rows[0].id;
  
      const res = await request(app).get(`/invoices/${invoiceId}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        invoice: expect.any(Array),
      });
    });
  
    test("Returns 404 for an invalid invoice ID", async () => {
      const res = await request(app).get("/invoices/999999");
      expect(res.statusCode).toBe(404);
      expect(res.body.error.message).toBe("Invoice not found");
    });
  });
  
  describe("POST /invoices", () => {
    test("Creates a new invoice", async () => {
      const res = await request(app).post("/invoices").send({
        comp_code: "apple",
        amt: 500,
      });
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        invoice: expect.objectContaining({
          id: expect.any(Number),
          comp_code: "apple",
          amt: 500,
          paid: false,
          paid_date: null,
        }),
      });
  
      // Check database for new invoice
      const dbRes = await db.query("SELECT * FROM invoices WHERE amt=500");
      expect(dbRes.rows.length).toBe(1);
    });
  
    test("Fails to create a new invoice with missing data", async () => {
      const res = await request(app).post("/invoices").send({
        amt: 500,
      });
      expect(res.statusCode).toBe(500); // Assuming no validation middleware for required fields
    });
  });
  
  describe("PUT /invoices/:id", () => {
    test("Updates an invoice amount", async () => {
      const invoiceRes = await db.query("SELECT id FROM invoices LIMIT 1");
      const invoiceId = invoiceRes.rows[0].id;
  
      const res = await request(app).put(`/invoices/${invoiceId}`).send({
        amt: 600,
      });
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        invoice: expect.objectContaining({
          id: invoiceId,
          amt: 600,
        }),
      });
  
      // Verify the update in the database
      const dbRes = await db.query("SELECT amt FROM invoices WHERE id=$1", [invoiceId]);
      expect(dbRes.rows[0].amt).toBe(600);
    });
  
    test("Marks an invoice as paid", async () => {
      const invoiceRes = await db.query("SELECT id FROM invoices WHERE paid=false LIMIT 1");
      const invoiceId = invoiceRes.rows[0].id;
  
      const res = await request(app).put(`/invoices/${invoiceId}`).send({
        paid: true,
        amt: 300,
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.invoice.paid).toBe(true);
      expect(res.body.invoice.paid_date).not.toBeNull();
    });
  
    test("Marks an invoice as unpaid", async () => {
      const invoiceRes = await db.query("SELECT id FROM invoices WHERE paid=true LIMIT 1");
      const invoiceId = invoiceRes.rows[0].id;
  
      const res = await request(app).put(`/invoices/${invoiceId}`).send({
        paid: false,
        amt: 200,
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.invoice.paid).toBe(false);
      expect(res.body.invoice.paid_date).toBeNull();
    });
  
    test("Returns 404 for updating a non-existent invoice", async () => {
      const res = await request(app).put("/invoices/999999").send({
        amt: 600,
      });
      expect(res.statusCode).toBe(404);
      expect(res.body.error.message).toBe("Invoice not found");
    });
  });
  
  describe("DELETE /invoices/:id", () => {
    test("Deletes an invoice", async () => {
      const invoiceRes = await db.query("SELECT id FROM invoices LIMIT 1");
      const invoiceId = invoiceRes.rows[0].id;
  
      const res = await request(app).delete(`/invoices/${invoiceId}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ status: "deleted" });
  
      // Verify the invoice is deleted from the database
      const dbRes = await db.query("SELECT * FROM invoices WHERE id=$1", [invoiceId]);
      expect(dbRes.rows.length).toBe(0);
    });
  
    test("Returns 404 for deleting a non-existent invoice", async () => {
      const res = await request(app).delete("/invoices/999999");
      expect(res.statusCode).toBe(404);
      expect(res.body.error.message).toBe("Invoice not found");
    });
  });
