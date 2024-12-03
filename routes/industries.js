const express = require("express");
const router = new express.Router();
const db = require("../db.js");
const ExpressError = require("../expressError.js");

router.get("/", async (req,res,next) => {
  try {
    // const results = await db.query('SELECT * FROM industries AS i JOIN comp_industries AS c ON i.code=c.ind_code');
    const results = await db.query('SELECT * FROM industries');
    const compResults = await db.query('SELECT comp_code FROM comp_industries AS c LEFT JOIN industries AS i ON c.ind_code=i.code')
    return res.json({industries:results.rows,comp_codes:compResults.rows})
  } catch (e) {
    return next(e)
  }
})


module.exports = router;