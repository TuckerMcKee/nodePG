const express = require("express");
const router = new express.Router();
const db = require("../db.js");
const ExpressError = require("../expressError.js");

router.get("/", async (req,res,next) => {
  try {
    const results = await db.query('SELECT i.industry,ARRAY_AGG(c.comp_code) AS comp_codes FROM industries AS i INNER JOIN comp_industries AS c ON c.ind_code=i.code GROUP BY i.code')
    return res.json({industries:results.rows})
  } catch (e) {
    return next(e)
  }
})

router.post("/", async (req,res,next) => {
    try {
        const {code, industry} = req.body;
        const results = await db.query(`INSERT INTO industries (code,industry) VALUES ($1,$2) RETURNING *`,[code,industry]);
      return res.json({industry:results.rows[0]})
    } catch (e) {
      return next(e)
    }
  })

router.post("/comp_industries", async (req,res,next) => {
    try {
        const {comp_code, ind_code} = req.body;
        const results = await db.query(`INSERT INTO comp_industries (comp_code,ind_code) VALUES ($1,$2) RETURNING *`,[comp_code,ind_code]);
      return res.json({comp_industry:results.rows[0]})
    } catch (e) {
      return next(e)
    }
  })


module.exports = router;