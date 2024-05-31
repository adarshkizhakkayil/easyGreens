const User = require("../models/userModel");
const Category = require("../models/categoryModel");
const Product = require("../models/productModel");
const bcrypt = require("bcrypt");
const Cart = require("../models/cartModel");
const Coupon = require("../models/couponModel");
const orderIdMake = require("../services/orderId");
const Order = require("../models/orderModel");

const { v4: uuidv4 } = require("uuid");

const crypto = require("crypto");
const Razorpay = require("razorpay");
const { default: mongoose } = require("mongoose");

var instance = new Razorpay({
  key_id: process.env.RAZ_KEYID,
  key_secret: process.env.RAZ_KEYSECRET,
});

const loadCheckout = async (req, res) => {
  try {
    const userId = req.session.userId;
    req.session.coupon = null;
    const cart = await cart.findOne({ user_id: userId }).populate({
      path: "products.product_id",
      populate: [
        { path: "offer" },
        {
          path: "categoryId",
          populate: { path: "offer" }, // Populate the offer field in the Category model
        },
      ],
    });
    req.session.couponApplied = false;
    const availableCoupons = await Coupon.aggregate([
      {
        $match: {
          $and: [
            { status: true },
            {
              "userUsed.user_id": {
                $nin: [new mongoose.Types.ObjectId(userId)],
              },
            },
          ],
        },
      },
    ]);
    if (userId && cart) {
      let originalAmts = 0;

      if (cart && cart.items) {
        cart.items.forEach((cartItem) => {
          let itemPrice = cartItem.price; // Adjust the property based on your data model
          originalAmts += itemPrice * cartItem.quantity;
        });
      }

      const user = await User.findOne({ _id: req.session.userId });
      const wallet = user.wallet;

      res.render("checkout", {
        cart,
        subTotal: originalAmts,
        user: [user],
        wallet,
        availableCoupons,
        calculateItemPrice,
      });
    } else {
      res.redirect("/");
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).render("serverError", { message: error.message });
  }
};

const loadAddNewAddress = async (req, res) => {
  try {
    res.render("addNewAddress");
  } catch (error) {
    console.log(error.message);
    res.status(500).render("serverError", { message: error.message });
  }
};

const postAddNewAddress = async (req, res) => {
  try {
    const { name, phone, streetAddress, city, state, pincode, email } =
      req.body;

    const user = await User.findOne({ _id: req.session.userId });
    if (user) {
      await User.updateOne(
        { _id: req.session.userId },
        {
          $push: {
            address: {
              name: name,
              phone: phone,
              street_address: streetAddress,
              city: city,
              state: state,
              pincode: pincode,
              email: email,
            },
          },
        }
      );
      res.redirect("/checkout");
    } else {
      res.redirect("/userSignIn");
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).render("serverError", { message: error.message });
  }
};

const postOrderPlaced = async (req, res) => {
  try {
    const { selectedAddress, selectedPayment } = req.body;

    const userId = req.session.userId;

    const cart = await Cart.findOne({ user_id: userId }).populate({
      path: "items.product_id",
      populate: [
        { path: "offer" },
        {
          path: "categoryId",
          populate: { path: "offer" }, // Populate the offer field in the Category model
        },
      ],
    });

    let subTotal = 0;
    cart.items.forEach((product) => {
      subTotal += calculateItemPrice(product.product_id, product.quantity);
    });

    const userData = await User.findOne({ _id: userId });
    const cartData = await Cart.findOne({ user_id: userId });
    const cartProducts = cartData.items;

    let status = "";
    if (selectedPayment === "cod") {
      status = "placed";
    } else if (selectedPayment === "razorpay") {
      status = "pending";
    } else if (selectedPayment === "walletPayment") {
      // Check if the wallet balance is sufficient for a 'placed' status
      status = userData.wallet >= subTotal ? "placed" : "pending";
    } else {
      // Handle unexpected or unknown payment methods
      status = "pending";
    }

    let walletDeduction = Math.min(userData.wallet, subTotal);
    let remainingAmount = subTotal - walletDeduction;
    const date = new Date();
    const orderDate = date.toLocaleDateString();

    const delivery = new Date(date.getTime() + 10 * 24 * 60 * 60 * 1000);
    const deliveryDate = delivery
      .toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      })
      .replace(/\//g, "-");

    var couponName = "";
    var couponDiscount = 0;
    if (req.session.coupon != null) {
      couponName = req.session.coupon.couponName;
      couponDiscount = req.session.coupon.discountAmount;
    }

    let OrderId = await orderIdMake();
    const randomOrderId = "CORN" + OrderId;

    const order = new Order({
      user_id: userId,
      order_id: randomOrderId,
      delivery_address: selectedAddress,
      user_name: userData.userName,
      total_amount: subTotal,
      status: status,
      date: orderDate,
      expected_delivery: deliveryDate,
      payment: selectedPayment,
      items: cartProducts,
      couponName: couponName,
      couponDiscount: couponDiscount,
    });

    let orderData = await order.save();

    const orderId = orderData._id; // Declare orderId at the beginning

    if (orderData.status == "placed") {
      if (selectedPayment === "walletPayment") {
        if (userData.wallet >= subTotal) {
          await User.updateOne(
            {
              _id: userId,
            },
            {
              $inc: {
                wallet: -subTotal,
              },
              $push: {
                wallet_history: {
                  date: new Date(),
                  amount: -subTotal,
                  description: "Order Payment using Wallet Amount",
                },
              },
            }
          );
        }

        await Cart.deleteOne({
          user_id: userId,
        });

        for (let i = 0; i < cartData.items.length; i++) {
          const productId = cartProducts[i].product_id;
          const count = cartProducts[i].quantity;

          await Product.updateOne(
            {
              _id: productId,
            },
            {
              $inc: {
                stockQuantity: -count,
              },
            }
          );
        }

        res.json({
          success: true,
          params: orderId,
        });
      } else if (selectedPayment == "cod") {
        await Cart.deleteOne({ user_id: userId });

        for (i = 0; i < cartData.items.length; i++) {
          const productId = cartProducts[i].product_id;

          const count = cartProducts[i].quantity;

          await Product.updateOne(
            { _id: productId },
            { $inc: { stockQuantity: -count } }
          );
        }
        res.json({ success: true, params: orderId });
      }
    } else {
      if (selectedPayment === "walletPayment" && userData.wallet < subTotal) {
        const options = {
          amount: remainingAmount.toFixed(0) * 100,
          currency: "INR",
          receipt: "" + orderId,
        };

        instance.orders.create(options, async function (err, order) {
          if (err) {
            console.log(err);
            res.json({
              success: false,
              order: order,
            });
          } else {
            res.json({
              success: false,
              order: order,
              walletDeduction: walletDeduction.toFixed(0),
            });
          }
        });
      } else {
        const totalAmount = orderData.total_amount;

        var options = {
          amount: totalAmount * 100, // Ensure amount is an integer
          currency: "INR",
          receipt: "" + orderId,
        };

        instance.orders.create(options, function (err, order) {
          if (err) {
            console.log(err);
          } else {
            return res.json({ success: false, order: order });
          }
        });
      }
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).render("serverError", { message: error.message });
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
