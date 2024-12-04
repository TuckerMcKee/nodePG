/** BizTime express application. */


const express = require("express");

const app = express();
const ExpressError = require("./expressError");
const companyRoutes = require("./routes/companies.js");
const invoiceRoutes = require("./routes/invoices.js");
const industryRoutes = require("./routes/industries.js");
app.use(express.json());

app.use('/companies',companyRoutes);
app.use('/invoices',invoiceRoutes);
app.use('/industries',industryRoutes);
/** 404 handler */

app.use(function(req, res, next) {
  const err = new ExpressError("Not Found", 404);
  return next(err);
});

/** general error handler */

app.use((err, req, res, next) => {
  res.status(err.status || 500);

  return res.json({
    error: err,
    message: err.message
  });
});


module.exports = app;
//Testing
