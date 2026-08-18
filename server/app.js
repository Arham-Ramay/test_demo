const express = require("express");
const cors = require("cors");
const path = require("path");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const orderRouter = require("./routes/orderRoute");
const paymentRouter = require("./routes/paymentRoute");
const productRouter = require("./routes/productRoute");
const userRouter = require("./routes/userRoute");
const contractRouter = require("./routes/contractRoute");
const { notFound, errorMiddleware } = require("./middlewares/helpers/errorMiddleware");

const app = express();

// The React dev server runs on a different origin, so the API has to opt in.
app.use(
  cors({
    origin: (process.env.CLIENT_URL || "http://localhost:3000").split(","),
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/api/order', orderRouter);
app.use('/api/payment', paymentRouter);
app.use('/api/product', productRouter);
app.use('/api/user', userRouter);
app.use('/api/contract', contractRouter);

// deployment
__dirname = path.resolve();
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "/frontend/build")));

  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "frontend", "build", "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res.send("Server is Running! 🚀");
  });
}

// Terminal handlers: every unmatched route and every thrown error leaves the
// app in the same JSON shape.
app.use(notFound);
app.use(errorMiddleware);

module.exports = app;
