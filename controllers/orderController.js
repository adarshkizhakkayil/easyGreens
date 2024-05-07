const address = require('../models/userDetailsModel');
const orderModel = require('../models/orderModel');
const products = require('../models/productModel');
const coupon = require('../models/couponModel');
const order = require('../models/orderModel');
const cart = require('../models/cartModel');
const user=require('../models/userModel');
const users=require('../models/userModel');
const paypal = require('paypal-rest-sdk');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { PAYPAL_MODE, PAYPAL_CLIENT_KEY, PAYPAL_SECRET_KEY, RETURN_URL, CANCEL_URL } = process.env;



paypal.configure({
    'mode': 'sandbox', 
    'client_id': process.env.PAYPAL_CLIENT_KEY,
    'client_secret': process.env.PAYPAL_SECRET_KEY
});
// console.log("sdsjkk",PAYPAL_SECRET_KEY)

var instance = new Razorpay({
    key_id: process.env.RAZ_KEYID,
    key_secret: process.env.RAZ_KEYSECRET,
  });
  
  
// Add this function to your server-side code
function calculateItemPrice(product, quantity, offerPercentage) {
    let itemPrice = product.prize;
    // console.log('itemPrice', itemPrice);
    // Check if there's an offer on the product
    if (product.offer) {
        const percentage = product.offer.percentage
        // console.log('percent', percentage);
        itemPrice -= (itemPrice * percentage) / 100;
        // console.log('itemprizeafteroffer', itemPrice);
    } else if (product.categoryId.offer) {
        const percentage = product.categoryId.offer.percentage;
        itemPrice -= (itemPrice * percentage) / 100;
    }

    return quantity * itemPrice;

}  

function generateOrderId() {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let orderId = '';
    for (let i = 0; i < 7; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        orderId += charset[randomIndex];
    }
    return orderId;
}

const orderId = async () => {
    const generatedOrderId = generateOrderId();
    const codeExist = await orderModel.findOne({ order_id: generatedOrderId });

    if (codeExist) {
        // If the order ID already exists, generate a new one by calling orderId() recursively.
        return orderId();
    }

    // If the order ID doesn't exist, return the generated order ID.
    return generatedOrderId;
}
  





const loadCheckout = async (req, res) => {
    try {
        const userId = req.session.userId;
        const userid = req.session.user._id;
        const cartProducts = await cart.findOne({ user: userid }).populate('products.productID').populate('user');
        const cartDetails = await cart.findOne({ user: userId }).populate('products.productID');
        const userData = await user.findById(userId); // Fetch the user data
        // const coup = await coupon.find();
        // console.log(coup)

        const walletAmount = userData.wallet.walletAmount;
        console.log("Wallet Amount:", walletAmount);

        const User = await user.findById(req.session.user._id);
     
        const totalcart = [];

        cartProducts.products.forEach(product => {
            totalcart.push(product.total);
        });
        let originalAmts = 0;
        if (cartDetails) {

            cartDetails.products.forEach((cartItem) => {
            let itemPrice = cartItem.productID.Prize;
            let itemQuantity = cartItem.quantity;
            // console.log("itemPrice:", itemPrice); // Log itemPrice to check its value
            // console.log("itemQuantity:", itemQuantity); // Log itemQuantity to check its value
            originalAmts += itemPrice * itemQuantity;
            // console.log("ds",originalAmts)
            });
        }

        const subtotal = totalcart.reduce((sum, value) => sum + value, 0);

        const coupons = await coupon.aggregate([
            {
                $match: {
                    minimumSpend: { $lte: subtotal },
                    isActive: true,
                    validFrom: { $lte: new Date() },
                    validTo: { $gte: new Date() }
                }
            },
            {
                $sort: { minimumSpend: -1 }
            },
            {
                $limit: 1
            }
        ]);
        console.log("coup",coupons);

        // Check if coupons array is not empty
        if (coupons.length > 0) {
            const [{ couponCode, couponName }] = coupons;
            
            if (req.query.id) {
                const userid = req.query.id;
                const Address = await address.findById({ _id: userid });
                res.render('checkout', { cartProducts, subtotal:originalAmts , Address, user, couponCode, couponName});
            } else {
                const Address = await address.findOne({ user: req.session.user._id });
                res.render('checkout', { cartProducts, subtotal:originalAmts , Address, user, couponCode, couponName});
            }
        } else {
            if (req.query.id) {
                const userid = req.query.id;
                const Address = await address.findById({ _id: userid });
                res.render('checkout', { cartProducts, subtotal:originalAmts , Address, user, walletAmount });
            } else {
                const Address = await address.findOne({ user: req.session.user._id });
                res.render('checkout', { cartProducts, subtotal:originalAmts , Address, user, walletAmount });
            }
        }

    } catch (error) {
        console.log(error.message);
        res.status(500).render('error');
    }
};



// const placeOrder = async (req,res) => {
//     try {
//         const { shippingID, paymentMethod, totalamount, subtotal ,stat} = req.body
//         const { selectedAddress, selectedPayment} = req.body;
//         const userId = req.session.user._id;
//         console.log("shippingID"," paymentMethod", "totalamount", "subtotal", "status",shippingID, paymentMethod, totalamount, subtotal, status)

//         const cart = await cart.findOne({ user_id: userId }).populate({
//             path: 'products.productID',
//             populate: [
//               { path: 'offer' },
//               {
//                 path: 'categoryId',
//                 populate: { path: 'offer' } // Populate the offer field in the Category model
//               }
//             ]
//         });

//         let subTotal = 0
//         cart.products.forEach((product) => {
//         subTotal += calculateItemPrice(product.productID, product.quantity);
//         console.log("subTotal",subTotal)
//         })

//         const userData = await user.findOne({ _id: userId });
//         console.log('userdata', userData);
//         const cartData = await cart.findOne({ user_id: userId });
//         const cartProducts = cartData.products;
//         console.log('iam cart products', cartProducts);
    
//         let status = '';
//         if (paymentMethod === 'cod') {
//           status = 'placed';
//         } else if (paymentMethod === 'razorpay') {
//           status = 'pending';
//         } else if (paymentMethod === 'walletPayment') {
//           // Check if the wallet balance is sufficient for a 'placed' status
//           status = userData.wallet >= subTotal ? 'placed' : 'pending';
//         } else {
//           // Handle unexpected or unknown payment methods
//           status = 'pending';
//         }

//         let walletDeduction = Math.min(userData.wallet, subTotal);
//         console.log('walletDeduction', walletDeduction);
//         let remainingAmount = subTotal - walletDeduction;
//         const date = new Date();
//         const orderDate = date.toLocaleDateString();

//         const delivery = new Date(date.getTime() + 10 * 24 * 60 * 60 * 1000);
//         const deliveryDate = delivery
//         .toLocaleString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })
//         .replace(/\//g, '-');

//         // var couponName = '';
//         // var couponDiscount = 0;
//         // if (req.session.coupon != null) {
//         // couponName = req.session.coupon.couponName;
//         // couponDiscount = req.session.coupon.discountAmount;
//         // }

//         let OrderId = await orderIdMake()
//         const randomOrderId = 'CORN' + OrderId;



//         const order = new Order({
//         user_id: userId,
//         order_id: randomOrderId,
//         delivery_address: selectedAddress,
//         user_name: userData.userName,
//         total_amount: subTotal,
//         status: status,
//         date: orderDate,
//         expected_delivery: deliveryDate,
//         payment: selectedPayment,
//         items: cartProducts,
//         couponName: couponName,
//         couponDiscount: couponDiscount,
//         });

//         let orderData = await order.save();

//         const orderId = orderData._id; // Declare orderId at the beginning

//         if (orderData.status == 'placed') {
//         if (selectedPayment === 'walletPayment') {
//             if (userData.wallet >= subTotal) {


//             await User.updateOne(
//                 {
//                 _id: userId,
//                 },
//                 {
//                 $inc: {
//                     wallet: -subTotal,
//                 },
//                 $push: {
//                     wallet_history: {
//                     date: new Date(),
//                     amount: -subTotal,
//                     description: 'Order Payment using Wallet Amount',
//                     },
//                 },
//                 }
//             );
//             }

//             await Cart.deleteOne({
//             user_id: userId,
//             });

//             for (let i = 0; i < cartData.items.length; i++) {
//             const productId = cartProducts[i].product_id;
//             const count = cartProducts[i].quantity;

//             await Product.updateOne(
//                 {
//                 _id: productId,
//                 },
//                 {
//                 $inc: {
//                     stockQuantity: -count,
//                 },
//                 }
//             );
//             }

//             res.json({
//             success: true,
//             params: orderId,
//             });
//         } else if (selectedPayment == 'cod') {
//             await Cart.deleteOne({ user_id: userId })

//             for (i = 0; i < cartData.items.length; i++) {
//             const productId = cartProducts[i].product_id

//             const count = cartProducts[i].quantity
//             console.log('iamcountsis' + count);

//             await Product.updateOne({ _id: productId }, { $inc: { stockQuantity: -count } })
//             }
//             res.json({ success: true, params: orderId })
//         }

//         } else {


//         if (selectedPayment === 'walletPayment' && userData.wallet < subTotal) {


//             console.log('walletdeduct', walletDeduction);
//             console.log('remain', remainingAmount);
//             console.log('Walletis', userData.wallet, 'ddd', subTotal);


//             const options = {
//             amount: remainingAmount.toFixed(0) * 100,
//             currency: 'INR',
//             receipt: '' + orderId,
//             };

//             instance.orders.create(options, async function (err, order) {
//             if (err) {
//                 console.log(err);
//                 res.json({
//                 success: false,
//                 order: order,
//                 });

//             } else {
//                 console.log('newOrders', JSON.stringify(order));
//                 res.json({
//                 success: false,
//                 order: order,
//                 walletDeduction: walletDeduction.toFixed(0),
//                 });


//             }
//             });
//         } else {
//             const totalAmount = orderData.total_amount;

//             var options = {
//             amount: totalAmount * 100,  // Ensure amount is an integer
//             currency: 'INR',
//             receipt: '' + orderId,
//             };

//             instance.orders.create(options, function (err, order) {
//             if (err) {
//                 console.log(err);
//             } else {
//                 console.log('newOrders', JSON.stringify(order));
//                 return res.json({ success: false, order: order });
//             }
//             });
//         }
//         }



//     } catch (error) {
        
//     }
// }



// const placeOrder = async (req, res) => {
//     try {
//         const userId = req.session.user._id;
//         const { shippingID, paymentMethod, totalamount, subtotal, status } = req.body
//         req.session.user.totalAmount = subtotal//changed
//         req.session.shippingID = shippingID;
//         req.session.user.status = status
//         req.session.user.subtotal = subtotal
//         // console.log("shippingID",shippingID,"paymentMethod", paymentMethod, "totalamount",totalamount, "subtotal",subtotal, "status",status)

//         const findCart = await cart.findOne({ user: userId }).populate('products.productID')
//         const cartProducts = findCart.products.map(products => products);

//         const totalCart = findCart.products.map(product => product.total);

//         if (paymentMethod === 'cod') {
//             const trackID = crypto.randomBytes(8).toString('hex');

//             let updated;
//             for (const item of findCart.products) {
//                 const productid = item.productID;
//                 const quantity = item.quantity;
//                 const updateStock = await products.findOne({ _id: productid });

//                 // Log the stock value before deduction
//                 // console.log('Stock before deduction:', updateStock.stock);

//                 // Check if the stock is already at zero
//                 if (updateStock.stock === 0) {
//                     // Set stock to 1 instead of returning an error
//                     updateStock.stock = 1;
//                 }

//                 // Check if deducting the quantity would make the stock negative
//                 if (updateStock.stock - quantity < 0) {
//                     // Set stock to 1 instead of returning an error
//                     updateStock.stock = 1;
//                 } else {
//                     // Deduct the quantity from the stock
//                     updateStock.stock -= quantity;
//                 }

//                 // Log the stock value after deduction
//                 // console.log('Stock after deduction:', updateStock.stock);

//                 // Continue with the stock update logic
//                 updated = await updateStock.save();
//             }

//             if (updated) {
//                 const placeorder = new order({
//                     customerID: userId,
//                     shippingAddress: shippingID,
//                     items: cartProducts.map(products => {
//                         return {
//                             productID: products.productID,
//                             productPrize: products.productID.Prize,
//                             quantity: products.quantity,
//                             orderStatus: 'ordered',
//                             returnOrderStatus: {
//                                 status: 'none',
//                                 reason: 'none'
//                             }
//                         }
//                     }),
//                     orderStatus: 'ordered',
//                     statusLevel: 1,
//                     totalAmount: totalamount,
//                     paymentMethod: paymentMethod,
//                     trackID: trackID
//                 });

//                 const saving = await placeorder.save();

//                 if (saving) {
//                     const deleteCart = await cart.deleteOne({ User: userId });
//                     res.status(200).json({ message: 'Order has been placed successfully', value: 0 });
//                 } else {
//                     res.status(200).json({ message: 'Failed to place the order', value: 404 });
//                 }
//             } else {
//                 res.status(200).json({ message: 'Failed to update stock', value: 404 });
//             }
//         } else if (paymentMethod == 'netbanking') {

//             const findCart = await cart.findOne({ user: userId }).populate('products.productID')

//             for (const item of findCart.products) {
//                 const productid = item.productID;
//                 const updateStock = await products.findOne({ _id: productid });
//                 if (updateStock.stock <= 0) {
//                     return res.status(200).json({ message: 'out of stock ', value: 2 });
//                 }
//             }

//             const create_payment_json = {
//                 "intent": "sale",
//                 "payer": {
//                     "payment_method": "paypal"
//                 },
//                 "redirect_urls": {
//                     "return_url": "http://localhost:8000/success",
//                     "cancel_url": "http://localhost:8000/cancel"
//                 },
//                 "transactions": [{
//                     "item_list": {
//                     //     "items": findCart.products.map(product => ({
//                     //         "name": product.productID.productName,
//                     //         "sku": "001",
//                     //         "price": product.productID.Prize,
//                     //         "currency": "USD",
//                     //         "quantity": product.quantity
//                     //     }))
//                     },
//                     "amount": {
//                         "currency": "USD",
//                         "total": totalamount == 0 ? totalamount + 1 : totalamount
//                     },
//                     "description": "Products in the cart"
//                 }]
//             };


//             paypal.payment.create(create_payment_json, function (error, payment) {
//                 if (error) {
//                     throw error;
//                 } else {
//                     // Handle the payment response
//                     for (let i = 0; i < payment.links.length; i++) {
//                         if (payment.links[i].rel === 'approval_url') {
//                             // Redirect to the approval URL
//                             res.status(200).json({
//                                 message: 'Order has been placed successfully',
//                                 value: 1,
//                                 link: payment.links[i].href
//                             });
//                         }
//                     }
//                 }
//             });


//         }
//     } catch (error) {
//         console.log(error.message);
//         res.status(500).render('error');
//     }
// };



//Razorpay







const LoadUserOrders = async (req, res) => {
    try {
        const id = req.session.user._id
        const userOrder = await order.findOne({ customerID: id });
        if (userOrder) {
            const orderedProducts = await order.find({ customerID: id })
                .populate('items.productID')
            res.render('orderedProducts', { orderedProducts, userOrder })
        } else {
            res.render('orderedProducts')

        }

    } catch (error) {
        console.log(error.message);
        res.status(500).render('error')

    }
}





const loadOrders = async (req, res) => {
    try {
        const findorders = await order.find();
        if (findorders) {
            res.render('order', { orders: findorders })
        } else {
            res.render('order');
        }

    } catch (error) {
        console.log(error.message);
        res.status(500).render('error')

    }
}


const loadOrderDetails = async (req, res) => {
    try {
        const id = req.query.id;
        const userid = req.session.user._id;
        const username = await user.findOne({ _id: userid });
        const name = username.firstName;
        const orderedProducts = await order.findOne({ _id: id })
            .populate({
                path: 'items.productID',
                model: 'products'
            });

        if (orderedProducts) {
            const totalAmount = orderedProducts.totalAmount;
            res.render('orderDetails', { name, orderedProducts, totalAmount });
        } else {
            res.render('orderDetails', { name });
        }
    } catch (error) {
        console.error(error.message);
        res.status(500).render('error')

    }
};



const loadPage = async (req, res) => {
    try {
        res.render('orderPlaced')

    } catch (error) {

        console.log(error);
        res.status(500).render('error')

    }
}








const adminCancelOrder = async (req, res) => {
    try {
        const orderID = req.body.orderId;
        const cancelOrder = await order.findOneAndUpdate({ 'items._id': orderID }, { $set: { 'items.$.orderStatus': 'canceled' } });
        if (cancelOrder) {
            res.status(200).json({ message: 'order canceled succesfully' });
        }


    } catch (error) {

        console.log(error.message);
        res.status(500).render('error')

    }
}



const loadManageOrder = async (req, res) => {
    try {
        const id = req.query.id;
        const orderedProducts = await order.findOne({ _id: id })
            .populate({
                path: 'items.productID',
                model: 'products'
            });
        const totalAmount = orderedProducts.totalAmount;
        res.render('adminOrderDetails', { orderedProducts, totalAmount });
    } catch (error) {

        console.log(error.message);
        res.status(500).render('error')

    }
}







const changeStatus = async (req, res) => {
    try {
        const { orderId, status } = req.body

        const changeStatus = await orderModel.findOneAndUpdate({ _id: orderId }, {
            $set: {
                orderStatus: status,
                updatedAt: Date.now()
            }
        });

    } catch (error) {
        console.log(error.message);
        res.status(500).render('error')

    }
}







const renderCancelPage = async (req, res) => {
    try {
        res.render('cancelPage');

    } catch (error) {

        console.log(error.message);
        res.status(500).render('error')

    }
}

// const cancelOrder = async (req, res) => {
//     try {
//         const orderID = req.body.orderId
//         const update = await order.findOneAndUpdate(
//             { 'items._id': orderID },
//             { $set: { 'items.$.orderStatus': 'canceled' } },
//             { new: true }
//         ).populate('items.productID');



//         if (update) {

//             if (update.paymentMethod == 'Net Banking') {



//                 const canceledProduct = update.items.map((products) => {
//                     return products.productID
//                 })
//                 const productPrize = canceledProduct.map((product) => {
//                     return product.Prize
//                 })
//                 const Prize = productPrize[0]
//                 const findUser = await user.findById(req.session.user._id);
//                 const wallethistory = {
//                     type: 'credit',
//                     amount: Prize,
//                     reason: 'cancel refund'
//                 }

//                 findUser.wallet.walletAmount = findUser.wallet.walletAmount + parseInt(Prize);
//                 findUser.wallet.walletHistory.push(wallethistory);
//                 await findUser.save();

//             }

//             res.status(200).json({ message: 'canceled product ' });
//         }

//     } catch (error) {
//         console.log(error.message);
//         res.status(500).render('error')

//     }
// }


const cancelOrder = async (req, res) => {
    try {
        const orderID = req.body.orderId
        const update = await order.findOneAndUpdate(
            { 'items._id': orderID },
            { $set: { 'items.$.orderStatus': 'canceled' } },
            { new: true }
        ).populate('items.productID');



        if (update) {

            if (update.paymentMethod == 'Net Banking') {

                const canceledProduct = update.items.map((products) => {
                    return products.productID
                })
                const productPrize = canceledProduct.map((product) => {
                    return product.Prize
                })
                const Prize = productPrize[0]
                const findUser = await user.findById(req.session.user._id);
                const wallethistory = {
                    type: 'credit',
                    amount: Prize,
                    reason: 'cancel refund'
                }

                findUser.wallet.walletAmount = findUser.wallet.walletAmount + parseInt(Prize);
                findUser.wallet.walletHistory.push(wallethistory);
                await findUser.save();

            }

            res.status(200).json({ message: 'canceled product ' });
        }

    } catch (error) {
        console.log(error.message);
        res.status(500).render('error')

    }
}


const loadWalletPage = async (req, res) => {
    try {
        const findWallet = await user.findById(req.session.user._id);
        res.render('wallet', { walletdata: findWallet });
    } catch (error) {
        console.log(error.message);
        res.status(500).render('error')

    }
}


// const placeOrderInPaypal = async (req, res) => {
//     try {

//         const userId = req.session.user._id;
//         /////////////////// finding ordered products from the cart ///////////
//         const findCart = await cart.findOne({ user: userId }).populate('products.productID')
//         const cartProducts = findCart.products.map(products => {
//             return products
//         })
//         ////////////////////////////////// total amount of cart ////////////
//         const totalCart = findCart.products.map(product => product.total);
//         const totalamount = req.session.user.totalAmount
//         const status = req.session.user.status;
//         const subtotal = totalamount;

//         const payerId = req.query.PayerID;
//         const paymentId = req.query.paymentId;


//         const execute_payment_json = {
//             "payer_id": payerId,
//             "transactions": [{
//                 "amount": {
//                     "currency": "USD",
//                     "total": totalamount == 0 ? totalamount + 1 : totalamount
//                 }
//             }]
//         };

//         paypal.payment.execute(paymentId, execute_payment_json, async function (error, payment) {
//             if (error) {
//                 console.log(error.response);
//                 throw error;
//             } else {
//                 const shippingID = req.session.shippingID

//                 ///////////////////////////////// generate trackid ////////////////

//                 const trackID = crypto.randomBytes(8).toString('hex');


//                 ///////////////  saving the order details  /////////////////////// 


//                 const placeorder = new order({
//                     customerID: userId,
//                     shippingAddress: shippingID,
//                     items: cartProducts.map(products => {
//                         return {
//                             productID: products.productID,
//                             productPrize: products.productID.Prize,
//                             quantity: products.quantity,
//                             orderStatus: 'ordered',
//                             returnOrderStatus: {
//                                 status: 'none',
//                                 reason: 'none'
//                             }
//                         }
//                     }),
//                     orderStatus: 'ordered',
//                     statusLevel: 1,
//                     totalAmount: totalamount,
//                     paymentMethod: 'Net Banking',
//                     trackID: trackID
//                 });
//                 const saving = await placeorder.save();
//                 if (saving) {

//                     /////////////////// reducing quantity of the ordered items ///////////////////

//                     for (const item of findCart.products) {
//                         const productid = item.productID;
//                         const quantity = item.quantity;
//                         const updateStock = await products.findOne({ _id: productid });
//                         if (updateStock.stock <= 0) {
//                             return res.status(200).json({ message: 'out of stock ', value: 2 });
//                         }
//                         updateStock.stock -= quantity;
//                         updateStock.save()
//                     }
//                      console.log('outside status'+ status) ;
//                     if (status) {
//                         const findUser = await user.findById(userId);
//                         const amountToDeduct = Math.max(subtotal, 0);
                    
//                         const history = {
//                             type: 'debit',
//                             amount: amountToDeduct,
//                             reason: 'purchased product'
//                         };
                    
//                         findUser.wallet.walletAmount -= amountToDeduct;
//                         findUser.wallet.walletHistory.push(history);
                    
//                         await findUser.save();
//                     }
                    

//                     const deleteCart = await cart.deleteOne({ user: userId });

//                     res.redirect('/order-placed')
//                 } else {
//                     res.status(200).json({ message: 'failed to place the order', value: 1 });
//                 }


//             }
//         });


//     } catch (error) {

//         console.log(error.message);
//         res.status(500).render('error')

//     }
// }













const placeOrder = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const totalamount = req.body.finalAmount
        const { shippingID, paymentMethod, subtotal, status } = req.body
        req.session.user.totalAmount = totalamount
        req.session.shippingID = shippingID;
        req.session.user.status = status
        req.session.user.subtotal = subtotal
        /////////////////// finding ordered products from the cart ///////////
        const findCart = await cart.findOne({ user: userId }).populate('products.productID')
        const cartProducts = findCart.products.map(products => {
            return products
        })
    
        ////////////////////////////////// total amount of cart ////////////

        const totalCart = findCart.products.map(product => product.total);
        // const totalamount = totalCart.reduce((sum, value) => sum = sum + value);


        const isCouponApplied = req.session.IsCouponApplied;
        const couponcode = req.session.couponCode;
        if (isCouponApplied) {
            const couponUpdate = await coupon.findOneAndUpdate({ couponCode: couponcode }, {
                $push: {
                    userUsers: req.session.user._id
                }
            })
        }



        //// if payment method if cash on delivery////////

        if (paymentMethod == 'cod') {

            ///////////////////////////////// generate trackid ////////////////

            const trackID = crypto.randomBytes(8).toString('hex');


            ///////////////  saving the order details  /////////////////////// 

            /////////////////// reducing quantity of the ordered items ///////////////////
            let updated
            for (const item of findCart.products) {
                const productid = item.productID;
                const quantity = item.quantity;
                const updateStock = await products.findOne({ _id: productid });
                if (updateStock.stock <= 0) {
                    return res.status(200).json({ message: 'out of stock ', value: 2 });
                }
                updateStock.stock -= quantity;
                updated = await updateStock.save()
            }

            const placeorder = new order({
                customerID: userId,
                shippingAddress: shippingID,
                items: cartProducts.map(products => {
                    return {
                        productID: products.productID,
                        productPrize: products.productID.Prize,
                        quantity: products.quantity,
                        orderStatus: 'ordered',
                        returnOrderStatus: {
                            status: 'none',
                            reason: 'none'
                        }
                    }
                }),
                orderStatus: 'ordered',
                statusLevel: 1,
                totalAmount: totalamount,
                paymentMethod: paymentMethod,
                trackID: trackID
            });
            let saving
            if (updated) {
                saving = await placeorder.save();
            }
            if (saving) {


                if (status) {
                    const finduser = await users.findById(userId);
                    const history = {
                        type: 'debit',
                        amount: subtotal,
                        reason: 'purchased product'
                    }
                    finduser.wallet.walletAmount -= Math.max(subtotal, 0);
                    finduser.wallet.walletHistory.push(history);
                    await finduser.save()
                }

                const deleteCart = await cart.deleteOne({ user: userId });

                res.status(200).json({ message: 'order has been placed suucefully', value: 0 })
            } else {
                res.status(200).json({ message: 'failed to place the order', value: 404 });
            }


            //// if payment method is paypal ////////

        } else if (paymentMethod == 'netbanking') {

            const findCart = await cart.findOne({ user: userId }).populate('products.productID')

            for (const item of findCart.products) {
                const productid = item.productID;
                const updateStock = await products.findOne({ _id: productid });
                if (updateStock.stock <= 0) {
                    return res.status(200).json({ message: 'out of stock ', value: 2 });
                }
            }

            const create_payment_json = {
                "intent": "sale",
                "payer": {
                    "payment_method": "paypal"
                },
                "redirect_urls": {
                    "return_url": "http://localhost:8000/success",
                     "cancel_url": "http://localhost:8000/cancel"
                    // "return_url": RETURN_URL,
                    // "cancel_url": CANCEL_URL
                },
                "transactions": [{
                    // "item_list": {
                    //     "items": findCart.products.map(product => ({
                    //         "name": product.productID.productName,
                    //         "sku": "001",
                    //         "price": product.productID.Prize,
                    //         "currency": "USD",
                    //         "quantity": product.quantity
                    //     }))
                    // },
                    "amount": {
                        "currency": "USD",
                        "total": totalamount == 0 ? totalamount + 1 : totalamount
                    },
                    "description": "Products in the cart"
                }]
            };


            paypal.payment.create(create_payment_json, function (error, payment) {
                if (error) {
                    throw error;
                } else {
                    // Handle the payment response
                    for (let i = 0; i < payment.links.length; i++) {
                        if (payment.links[i].rel === 'approval_url') {
                            // Redirect to the approval URL
                            res.status(200).json({
                                message: 'Order has been placed successfully',
                                value: 1,
                                link: payment.links[i].href
                            });
                        }
                    }
                }
            });


        }

    } catch (error) {
        console.log(error.message);
        res.status(500).render('error')

    }
}






const placeOrderInPaypal = async (req, res) => {
    try {

        const userId = req.session.user._id;
        /////////////////// finding ordered products from the cart ///////////
        const findCart = await cart.findOne({ user: userId }).populate('products.productID')
        const cartProducts = findCart.products.map(products => {
            return products
        })
        ////////////////////////////////// total amount of cart ////////////
        const totalCart = findCart.products.map(product => product.total);
        const totalamount = req.session.user.totalAmount
        const status = req.session.user.status;
        const subtotal = totalamount;

        const payerId = req.query.PayerID;
        const paymentId = req.query.paymentId;


        const execute_payment_json = {
            "payer_id": payerId,
            "transactions": [{
                "amount": {
                    // "currency": "USD",
                    // "total": totalamount == 0 ? totalamount + 2 : totalamount
                    "currency": "INR",  // Change currency to INR
                    
                    "total": totalamount == 0 ? totalamount + 1 : totalamount.toString()
                }
            }]
        };

        paypal.payment.execute(paymentId, execute_payment_json, async function (error, payment) {
            if (error) {
                console.log(error.response);
                throw error;
            } else {
                const shippingID = req.session.shippingID

                ///////////////////////////////// generate trackid ////////////////

                const trackID = crypto.randomBytes(8).toString('hex');


                ///////////////  saving the order details  /////////////////////// 


                const placeorder = new order({
                    customerID: userId,
                    shippingAddress: shippingID,
                    items: cartProducts.map(products => {
                        return {
                            productID: products.productID,
                            productPrize: products.productID.Prize,
                            quantity: products.quantity,
                            orderStatus: 'ordered',
                            returnOrderStatus: {
                                status: 'none',
                                reason: 'none'
                            }
                        }
                    }),
                    orderStatus: 'ordered',
                    statusLevel: 1,
                    totalAmount: totalamount,
                    paymentMethod: 'Net Banking',
                    trackID: trackID
                });
                const saving = await placeorder.save();
                if (saving) {

                    /////////////////// reducing quantity of the ordered items ///////////////////

                    for (const item of findCart.products) {
                        const productid = item.productID;
                        const quantity = item.quantity;
                        const updateStock = await products.findOne({ _id: productid });
                        if (updateStock.stock <= 0) {
                            return res.status(200).json({ message: 'out of stock ', value: 2 });
                        }
                        updateStock.stock -= quantity;
                        updateStock.save()
                    }
                     console.log('outside status'+ status) ;
                    if (status) {
                        const findUser = await user.findById(userId);
                        const amountToDeduct = Math.max(subtotal, 0);
                    
                        const history = {
                            type: 'debit',
                            amount: amountToDeduct,
                            reason: 'purchased product'
                        };
                    
                        findUser.wallet.walletAmount -= amountToDeduct;
                        findUser.wallet.walletHistory.push(history);
                    
                        await findUser.save();
                    }
                    

                    const deleteCart = await cart.deleteOne({ user: userId });

                    res.redirect('/order-placed')
                } else {
                    res.status(200).json({ message: 'failed to place the order', value: 1 });
                }


            }
        });


    } catch (error) {

        console.log(error.message);
        res.status(500).render('error')

    }
}

module.exports={
    loadOrders,
    loadCheckout,
    placeOrder,
    loadPage,
    LoadUserOrders,
    loadOrderDetails,
    loadManageOrder,
    adminCancelOrder,
    changeStatus,
    renderCancelPage,
    cancelOrder,
    loadWalletPage,
    placeOrderInPaypal
}