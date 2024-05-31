const express = require("express");
const app = express();
const path = require("path");
const morgan = require('morgan');
const connectDatabase=require("./config/db");
connectDatabase();
const userRoute = require("./routes/userRoute");
const adminRoute = require("./routes/adminRoute");

// Set up static files middleware
app.use(express.static(path.join(__dirname, "/public")));
app.set('view engine','ejs');
app.use(morgan('tiny'));

app.use("/", userRoute);
app.use("/admin", adminRoute);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

