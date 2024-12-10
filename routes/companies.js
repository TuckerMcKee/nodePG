const express = require("express");
const slugify = require("slugify");
const router = new express.Router();
const db = require("../db.js");
const ExpressError = require("../expressError.js");

router.get("/", async (req,res,next) => {
  try {
    const results = await db.query('SELECT * FROM companies');
  return res.json({companies:results.rows})
  } catch (e) {
    return next(e)
  }
})
  router.get("/:code", async (req,res,next) => {
    try {
        const {code} = req.params;
        const compResults = await db.query(`SELECT * FROM companies WHERE code=$1`,[code]);
        if (compResults.rows.length === 0) throw new ExpressError("Company not found",404);
        const invoiceResults = await db.query(`SELECT * FROM invoices WHERE comp_code=$1`,[code]);
        const indResults = await db.query(`SELECT industry FROM industries AS i LEFT JOIN comp_industries AS c ON c.ind_code=i.code WHERE c.comp_code=$1`,[code]);
        const {name,description} = compResults.rows[0];
        const invoices = invoiceResults.rows;
        const industries = indResults.rows.map(x => x.industry);
        return res.json({company:{code,name,description,invoices,industries}})
    } catch (e) {
      return next(e)
    }
  })


router.post("/", async (req,res,next) => {
  try {
    const {name, description} = req.body;
    const results = await db.query(`INSERT INTO companies (code,name,description) VALUES ($1,$2,$3) RETURNING *`,[slugify(name,{lower:true,strict:true}),name,description]);
  return res.json({company:results.rows[0]})
  } catch (e) {
    return next(e)
  }
})

router.put("/:code", async (req,res,next) => {
  try {
      const {code} = req.params;
      const {name, description} = req.body;
      const results = await db.query(`UPDATE companies SET name=$1,description=$2 WHERE code=$3 RETURNING *`,[name,description,code]);
      if (results.rows.length === 0) throw new ExpressError("Company not found",404);
      return res.json({company:results.rows})
  } catch (e) {
    return next(e)
  }
})

router.delete("/:code", async (req,res,next) => {
  try {
      const {code} = req.params;
      const results = await db.query(`DELETE FROM companies WHERE code=$1`,[code]);
      if (results.rowCount === 0) throw new ExpressError("Company not found",404);
      return res.json({status:"deleted"})
  } catch (e) {
    return next(e)
  }
})

module.exports = router;