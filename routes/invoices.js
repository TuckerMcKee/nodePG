const express = require("express");
const router = new express.Router();
const db = require("../db.js");
const ExpressError = require("../expressError.js");

router.get("/", async (req,res,next) => {
  try {
    const results = await db.query('SELECT id, comp_code FROM invoices');
    return res.json({invoices:results.rows})
  } catch (e) {
    return next(e)
  }
})

router.get("/:id", async (req,res,next) => {
    try {
        const {id} = req.params;
        const results = await db.query(`SELECT * FROM invoices WHERE id=$1`,[id]);
        if (results.rows.length === 0) throw new ExpressError("Invoice not found",404);
        return res.json({invoice:results.rows})
    } catch (e) {
      return next(e)
    }
  })


router.post("/", async (req,res,next) => {
  try {
    const {comp_code,amt} = req.body;
    const results = await db.query(`INSERT INTO invoices (comp_code,amt) VALUES ($1,$2) RETURNING *`,[comp_code,amt]);
  return res.json({invoice:results.rows[0]})
  } catch (e) {
    return next(e)
  }
})

router.put("/:id", async (req,res,next) => {
  try {
      const {id} = req.params;
      let amt,paid;
      let results;
      if (req.body.paid === undefined) {
       amt = req.body.amt;
      }
      else {
        amt = req.body.amt;
        paid = req.body.paid;
      }
      if (paid) {
        results = await db.query(`UPDATE invoices SET amt=$1,paid=$2,paid_date=CURRENT_DATE WHERE id=$3 RETURNING *`,[amt,paid,id]);
      }
      if (paid === false){
        results = await db.query(`UPDATE invoices SET amt=$1,paid=$2,paid_date=NULL WHERE id=$3 RETURNING *`,[amt,paid,id]);
      }
      if (paid === undefined){
        results = await db.query(`UPDATE invoices SET amt=$1 WHERE id=$2 RETURNING *`,[amt,id]);
      }
      if (results.rows.length === 0) throw new ExpressError("Invoice not found",404);
      return res.json({invoice:results.rows[0]})
  } catch (e) {
    return next(e)
  }
})

router.delete("/:id", async (req,res,next) => {
  try {
      const {id} = req.params;
      const results = await db.query(`DELETE FROM invoices WHERE id=$1`,[id]);
      if (results.rowCount === 0) throw new ExpressError("Invoice not found",404);
      return res.json({status:"deleted"})
  } catch (e) {
    return next(e)
  }
})

module.exports = router;