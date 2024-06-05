const express=require("express");
const userRoute=express();
const path=require("path");
const session=require("express-session");

const userController=require("../controllers/userController");
const cartController=require("../controllers/cartController");
const orderController = require('../controllers/orderController');
const couponController = require('../controllers/couponController');
const auth= require('../middleware/userAuth');
const config=require("../config/config");
// Use the session middleware
userRoute.use(session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
}));
// Set view engine and views
userRoute.set('views',path.join(__dirname,"..","views","user"));
userRoute.use(express.json());
userRoute.use(express.urlencoded({ extended: true }));
//Routes
// Signup & login
userRoute.get('/', auth.isLoggedOut, userController.loadHome);
userRoute.get('/home', auth.isLoggedIn, userController.loadHome);
userRoute.get('/signup', auth.isLoggedOut, userController.loadSignup);
userRoute.post('/signup', userController.insertUser);
userRoute.get('/login', auth.isLoggedOut,  userController.loadLogin);
userRoute.post('/login',auth.isLoggedIn, userController.verifyLogin);
userRoute.get('/logout',userController.logout);
userRoute.get('/otpverification', auth.isLoggedIn, userController.loadOtp);
userRoute.post('/otpverification', userController.verifyOtp);
userRoute.post('/resend-otp', userController.resendOtp);
userRoute.post('/resend-forgtotOTP', userController.resendforgotPasswordOtp);
//Shop & cart
userRoute.get('/shop', auth.isLoggedIn, userController.loadShop);
userRoute.get('/product-detail', auth.isLoggedIn, userController.loadProductDetails);
userRoute.get('/check-cart', auth.isLoggedIn, cartController.checkCart);
userRoute.get('/product-cart', auth.isLoggedIn, cartController.loadCart)
userRoute.post('/product-cart', cartController.addToCart)
userRoute.post('/remove-product', cartController.removeProduct)
userRoute.post('/incrementQuantity', cartController.incrementQuantity)
userRoute.post('/decrementQuantity', cartController.decrementQuantity)
//checkout
userRoute.get('/checkout', auth.isLoggedIn, orderController.loadCheckout);
userRoute.post('/place-order', orderController.placeOrder)
userRoute.get('/order-placed', auth.isLoggedIn, orderController.loadPage)
// userRoute.get('/blocked', auth.isLoggedIn, userController.loadBLock)
userRoute.get('/order',auth.isLoggedIn,orderController.LoadUserOrders)
userRoute.get('/order-details',auth.isLoggedIn,orderController.loadOrderDetails)
userRoute.post('/cancel-order', auth.isLoggedIn, orderController.cancelOrder)
userRoute.get('/success', auth.isLoggedIn, orderController.placeOrderInPaypal)
userRoute.get('/cancel', auth.isLoggedIn, orderController.renderCancelPage);

///// user account
userRoute.get('/user-account', auth.isLoggedIn, userController.loadProfile)
userRoute.post('/user-account', userController.saveUser)
userRoute.get('/add-address', auth.isLoggedIn, userController.loadEditUserAddress)
userRoute.post('/add-address', userController.editAddress)
userRoute.post('/change-password',userController.changePassword);
userRoute.post('/update-password',userController.updatePassword)
userRoute.post('/edit-profile',userController.editProfile)
userRoute.get('/forgot-password',userController.LoadforgotPassword)
userRoute.post('/forgot-password',userController.checkEmail)
userRoute.get('/password-otp',userController.LoadforgotPasswordOtp)
userRoute.post('/password-otp',userController.verifyPasswordOtp)
userRoute.post('/reset-password',userController.resetPassword)
userRoute.get('/allCoupon',couponController.loadAllCoupon)

userRoute.post('/verifyCoupon',couponController.verifyCoupon)
// sample

// userRoute.get('/check-wishlist', auth.isLoggedIn, cartController.checkCart)
userRoute.get('/wishlist', auth.isLoggedIn,cartController.Loadwishlist);
userRoute.post('/wishlist',cartController.addToWishlist);
userRoute.get('/wallet',orderController.loadWalletPage);

userRoute.get('/cancel', auth.isLoggedIn, orderController.renderCancelPage);
userRoute.post('/cancel-order', auth.isLoggedIn, orderController.cancelOrder);
userRoute.post('/return-order',orderController.returnOrder);

// // userRoute.get('/about', auth.isLoggedIn, userController.loadAboutUs)
// // userRoute.get('/contact-us', auth.isLoggedIn, userController.loadContact);
userRoute.post('/getInvoiceData',couponController.fetchInvoiceData)




module.exports=userRoute;