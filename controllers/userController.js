const bcrypt = require("bcrypt");
const crypto = require("crypto");

const user = require("../models/userModel");
const products = require("../models/productModel");
const category = require("../models/categoryModel");
const address = require("../models/userDetailsModel");
const coupon = require("../models/couponModel");


const { sendVerificationEmail } = require("../services/otpVerification");
const {
  sendForgotPassOtp,
} = require("../services/forgotPasswordOtpVerification");

let userid = 0;
let userotp = 0;

function generateOTP() {
  const randomBytes = crypto.randomBytes(4);
  const otp = randomBytes.readUInt32BE(0);
  return (otp % 1000000).toString().padStart(6, "0");
}

const securepassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {
    console.log(error.message);
  }
};

const loadSignup = async (req, res) => {
  try {
    res.render("userSignup", { message: "check" });
  } catch (error) {
    console.log(error.message);
    res.status(500).render("error");
  }
};



const insertUser = async (req, res) => {
  const spassword = await securepassword(req.body.password);
  const checkemail = req.body.email;
  const username = req.body.firstname;
  try {
    const findemail = await user.findOne({ email: checkemail });
    
    if (!findemail) {
      let code = shortid.generate()
      const usersubmit = new user({
        firstName: req.body.firstname,
        secondName: req.body.lastname,
        email: req.body.email,
        mobile: req.body.mobile,
        password: spassword,
        is_admin: 0,
        is_verified: 0,
        is_blocked: 0,
        refercode:code
      });
      const userdata = await usersubmit.save();
      userid = userdata._id;
      if (req.query.refercode) {
        let refferalcode = req.query.refercode;
        let id = req.query.userid;
      
        // Assuming the referralModel has the structure to find the referral details
        let selectedRefer = await refferalModel.findOne();
        let refferedamount = selectedRefer.refferedamount;
        let refferalamount = selectedRefer.refferalamount;
      
        SignupWithReffer = true;
      
        // Find the user by ID
        let user = await userModel.findById(id);
        if (user) {
          console.log('User found');
      
          // Update the wallet balance and add a transaction to the wallet history
          user.wallet.walletAmount += refferalamount;
          user.wallet.walletHistory.push({
            amount: refferalamount,
            type: 'credit(Refferal bonus)',
            reason: 'Referral bonus for referring a user',
          });
      
          // Save the updated user document
          await user.save();
        } else {
          console.log('User not found');
        }
      }
      
      if (userdata) {
        const clientOtp = await generateOTP();
        req.session.user = userdata;
        req.session.otp = clientOtp;
        await sendVerificationEmail(checkemail, clientOtp, username);
        res.redirect("/otpverification");
      }
    } else {
      res.render("userSignup", {
        message1: "email already in use , please try another one !",
      });
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).render("error");
  }
};

// const insertUser = async (req, res) => {
//   try {
//     console.log('Received request:', req.method, req.url);
//     console.log('Request body:', req.body);

//     const spassword = await securepassword(req.body.password);
//     const checkemail = req.body.email;
//     const username = req.body.firstname;

//     console.log('Starting user insertion process');

//     const findemail = await user.findOne({ email: checkemail });

//     if (!findemail) {
//       console.log('Email not found, creating new user');
      
//       let code = shortid.generate();
//       const usersubmit = new user({
//         firstName: req.body.firstname,
//         secondName: req.body.lastname,
//         email: req.body.email,
//         mobile: req.body.mobile,
//         password: spassword,
//         is_admin: 0,
//         is_verified: 0,
//         is_blocked: 0,
//         refercode: code,
//         wallet: {
//           walletAmount: 0,
//           walletHistory: []
//         }
//       });

//       const userdata = await usersubmit.save();
//       let userid = userdata._id;
//       console.log('New user created:', userdata);

//       // Check for referral code and update referrer's wallet
//       if (req.body.refercode) {
//         console.log('Referral code found:', req.body.refercode);
        
//         let refferalcode = req.body.refercode;
//         let selectedRefer = await refferalModel.findOne({ code: refferalcode });

//         if (selectedRefer) {
//           console.log('Referral details found:', selectedRefer);

//           let refferedamount = selectedRefer.refferedamount;
//           let refferalamount = selectedRefer.refferalamount;

//           let referrer = await userModel.findOne({ refercode: refferalcode });

//           if (referrer) {
//             console.log('Referrer found:', referrer);

//             referrer.wallet.walletAmount += refferalamount;
//             referrer.wallet.walletHistory.push({
//               amount: refferalamount,
//               type: 'credit',
//               reason: 'Referral bonus for referring a user',
//               date: new Date()
//             });

//             await referrer.save();
//             console.log('Referrer wallet updated:', referrer.wallet);
//           }

//           // Update new user's wallet for being referred
//           userdata.wallet.walletAmount += refferedamount;
//           userdata.wallet.walletHistory.push({
//             amount: refferedamount,
//             type: 'credit',
//             reason: 'Bonus for signing up with referral code',
//             date: new Date()
//           });

//           await userdata.save();
//           console.log('New user wallet updated:', userdata.wallet);
//         } else {
//           console.log('Invalid referral code');
//         }
//       }

//       if (userdata) {
//         const clientOtp = await generateOTP();
//         req.session.user = userdata;
//         req.session.otp = clientOtp;
//         await sendVerificationEmail(checkemail, clientOtp, username);
//         res.redirect("/otpverification");
//       }
//     } else {
//       console.log('Email already in use');
//       res.render("userSignup", {
//         message1: "Email already in use, please try another one!",
//       });
//     }
//   } catch (error) {
//     console.error('Error during user insertion:', error.message);
//     res.status(500).render("error");
//   }
// };




const loadOtp = async (req, res) => {
  try {
    res.render("otpverification");
  } catch (error) {
    console.log(error.message);
    res.status(500).render("error");
  }
};

const resendOtp = async (req, res) => {
  try {
    const clientOtp = await generateOTP();
    const checkemail = req.session.user.email;
    const username = req.session.user.firstName;

    // Update the session with the new OTP
    req.session.otp = clientOtp;

    // Send the verification email
    await sendVerificationEmail(checkemail, clientOtp, username);

    res.render("otpverification", {
      message: "OTP has been resent successfully.",
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).render("error");
  }
};

const resendforgotPasswordOtp = async (req, res) => {
  try {
    const clientOtp = await generateOTP();
    const email = req.session.tempUser.email;
    const username = req.session.tempUser.firstName;

    req.session.forgototp = clientOtp;

    await sendForgotPassOtp(email, clientOtp, username);

    res.status(200).json({ messge: "otp resended" });
  } catch (error) {
    console.log(error.message);
    res.status(500).render("error");
  }
};

const verifyOtp = async (req, res) => {
  try {
  
    if (req.session.otp === req.body.otp) {
      const data = await user
        .updateOne({ _id: userid }, { $set: { is_verified: 1 } })
        .exec();
      res.redirect("/login"); //home changed
    } else {
      res.render("otpverification", {
        message: "Invalid OTP. Please try again.",
      });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).render("error");
  }
};

const verifyMail = async (req, res) => {
  try {
    const updatedInfo = await user.updateOne(
      { _id: req.query.id },
      { $set: { is_verified: 1 } }
    );
    res.redirect("/home");
  } catch (error) {
    console.log(error.message);
  }
};

const loadHome = async (req, res) => {
  try {
    if (req.session.user) {
      const userId = req.session.user._id;
      const userData = await user.findById({ _id: userId });
      res.render("home", {
        userData,
        isLoggedIn: true,
        user: req.session.user,
      });
    } else {
      res.render("home", { isLoggedIn: false, user: req.session.user });
    }
  } catch (error) {
    console.log(error);
    res.status(500).render("error");
  }
};

const loadLogin = async (req, res) => {
  try {
    if (req.session.loggedIn) {
      res.redirect("/home");
    } else {
      res.render("userLogin");
    }
  } catch (error) {
    console.log("loadLogin", error.message);
    res.status(500).render("error");
  }
};

const verifyLogin = async (req, res) => {
  try {
    const email = req.body.email;
    const password = req.body.password;
    const userData = await user.findOne({ email: email });

    if (userData) {
      if (userData.is_verified === 0) {
        return res.render("login", {
          message: "Please verify your email to log in.",
        });
      }

      const passwordMatch = await bcrypt.compare(password, userData.password);

      if (passwordMatch) {
        req.session.loggedIn = true;
        req.session.user = userData;
        req.session.userId = userData._id;
        return res.redirect("/");
      } else {
        return res.render("login", {
          message: "Email and password are incorrect.",
        });
      }
    } else {
      return res.render("login", {
        message: "Email and password are incorrect.",
      });
    }
  } catch (error) {
    console.log(error.message);
    return res.status(500).send("Internal Server Error");
  }
};

const logout = async (req, res) => {
  try {
    req.session.destroy();
    res.redirect("/home");
  } catch (error) {
    console.log(error.message);
    res.status(500).render("error");
  }
};
/*-----------------------------------------------------------------------------------------------------------------------------------------------------*/

const loadShop = async (req, res) => {
  try {
    const categoryCollection = await category.find({ is_listed: 0 });

    let query = {};
    let totalPages = 2;

    if (req.query.cat) {
      query = { category: req.query.cat };
    } else if (req.query.page) {
      const page = req.query.page || 1;
      const limit = 9;
      const skip = (page - 1) * limit;
      const count = await products.find(query).countDocuments();
      const limitedProducts = await products
        .find(query)
        .skip(skip)
        .limit(limit)
        .populate("category");
      totalPages = Math.ceil(count / limit);
      return res.render("shop", {
        category: categoryCollection,
        product: limitedProducts,
        totalPages,
        page,
        user: req.session.user,
      });
    } else if (req.query.search) {
      const search = req.query.search;
      query = { productName: { $regex: search, $options: "i" } };
    } else if (req.query.sort) {
      const filter = req.query.sort;
      const sortOrder = filter == 1 ? 1 : -1;

      if (req.query.cat) {
        // Check if a category is selected
        query = { category: req.query.cat };
      }

      const sortedProducts = await products
        .find(query)
        .sort({ Prize: sortOrder });
      return res.render("shop", {
        product: sortedProducts,
        category: categoryCollection,
        totalPages,
        user: req.session.user,
      });

      // } else if (req.query.sort) {
      //     const filter = req.query.sort;
      //     const sortOrder = filter == 1 ? 1 : -1;
      //     const sortedProducts = await products.find(query).sort({ Prize: sortOrder });
      //     return res.render('shop', { product: sortedProducts, category: categoryCollection, totalPages ,user:req.session.user});
    } else {
      const producta = await products.find(query).populate("category").limit(9);
      const product = producta.filter(
        (producta) => producta.category.is_listed == 0
      );
      return res.render("shop", {
        category: categoryCollection,
        product,
        totalPages,
        user: req.session.user,
      });
    }

    const product = await products.find(query);

    res.render("shop", {
      category: categoryCollection,
      product,
      totalPages,
      user: req.session.user,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).render("error");
  }
};

const loadProductDetails = async (req, res) => {
  try {
    const id = req.query.id;
    const findproduct = await products.findById({ _id: id });
    const catgoryid = findproduct.category;
    const relatedproducts = await products.find({ category: catgoryid });
    const categoryCollection = await category.find({ is_listed: 0 });

    res.render("shop-details", {
      product: findproduct,
      Products1: relatedproducts,
      category: categoryCollection,
      user: req.session.user,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).render("error");
  }
};

/*-----------USER PROFILE---------------------------------------------------------------------------------------*/

const loadProfile = async (req, res) => {
  try {
    if (req.session.user) {
      const finduser = await user.findById({ _id: req.session.user._id });
      const Address = await address.find({ user: req.session.user._id });
      const coupons = await coupon.find();
      let refer = await refferalModel.findOne()
      res.render("userProfile", { user: finduser, Address, coupons,refer });
    } else {
      res.redirect("/signup");
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).render("error");
  }
};

const saveUser = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const {
      streetAddress: streetAddress,
      city: town,
      zip: zipcode,
      state,
      apartment: houseName,
      country,
    } = req.body;
    const saveUser = new address({
      user: userId,
      state: state,
      town: town,
      streetAddress: streetAddress,
      houseName: houseName,
      country: country,
      zipcode: zipcode,
    });
    const saving = await saveUser.save();
    if (saving) {
      res.status(200).json({ message: "succefuly added details" });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).render("error");
  }
};

const loadEditUserAddress = async (req, res) => {
  try {
    if (req.session.user) {
      const finduser = await user.findById({ _id: req.session.user._id });
      const Address = await address.find({ user: req.session.user._id });
      res.render("address-editing", { user: finduser, Address });
    } else {
      res.redirect("/register");
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).render("error");
  }
};

const editAddress = async (req, res) => {
  try {
    const userid = req.query.id;
    const userID = req.session.user._id;
    const {
      streetAddress: streetAddress,
      apartment: houseName,
      city: town,
      state: state,
      zipcode: zipcode,
      country: country,
    } = req.body;
    const Editddress = await address.findByIdAndUpdate(
      { _id: userid },
      {
        user: userID,
        state,
        town,
        streetAddress,
        houseName,
        country,
        zipcode,
      }
    );

    if (Editddress) {
      res.redirect("/add-address");
    }
  } catch (error) {
    console.log(error);
    res.status(500).render("error");
  }
};

const changePassword = async (req, res) => {
  try {
    const newPassword = req.body.password;
    const userid = req.session.user._id;
    const finduser = await user.findOne({ _id: userid });
    const checkpassword = await bcrypt.compare(newPassword, finduser.password);
    if (checkpassword) {
      res.status(200).json({ value: 0 });
    } else {
      res.status(200).json({ message: "password is incorrect", value: 1 });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).render("error");
  }
};

const updatePassword = async (req, res) => {
  try {
    const newPassword = req.body.password;
    const hashedPassword = await securepassword(newPassword);
    const updatePassword = await users.findOneAndUpdate(
      { _id: req.session.user._id },
      {
        $set: { password: hashedPassword },
      }
    );
    if (updatePassword) {
      res.status(200).json({ message: "password updated succesfully" });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).render("error");
  }
};

const editProfile = async (req, res) => {
  try {
    const { firstname, secondname, mobile } = req.body;
    const userid = req.session.user._id;
    const updateProfile = await user.findByIdAndUpdate(
      { _id: userid },
      {
        $set: {
          firstName: firstname,
          secondName: secondname,
          mobile: mobile,
        },
      }
    );

    if (updateProfile) {
      res.json({ message: "updated succefully" });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).render("error");
  }
};

const LoadforgotPassword = async (req, res) => {
  try {
    res.render("forgot-password");
  } catch (error) {
    console.log(error.message);
    res.status(500).render("error");
  }
};

const checkEmail = async (req, res) => {
  try {
    const { email } = req.body;
    const checkEmail = await user.findOne({ email: email });
    if (!checkEmail) {
      // If email is not registered
      return res
        .status(200)
        .json({ message: "Email is not registered", value: 0 });
    } else {
      clientOtp = await generateOTP();
      const username = checkEmail.firstName;
      req.session.tempUser = checkEmail;
      req.session.forgototp = clientOtp;
      await sendForgotPassOtp(email, clientOtp, username);
      return res
        .status(200)
        .json({ message: "Email is  registered", value: 1 });
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).render("error");
  }
};

const LoadforgotPasswordOtp = async (req, res) => {
  try {
    res.render("forgot-password-otp", { otpverified: 0 });
  } catch (error) {
    console.log(error.message);
    res.status(500).render("error");
  }
};

const verifyPasswordOtp = async (req, res) => {
  try {
    const { otp1, otp2, otp3, otp4, otp5, otp6 } = req.body;
    const frontendotp = parseInt(otp1 + otp2 + otp3 + otp4 + otp5 + otp6);
    const user = req.session.tempUser;
    const bakendotp = req.session.forgototp;
    if (frontendotp == bakendotp) {
      res.render("forgot-password-otp", { otpverified: 1 });
    } else {
      res.render("forgot-password-otp", {
        otpverified: 0,
        errormessage: "invalid OTP please try again.",
      });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).render("error");
  }
};

const resetPassword = async (req, res) => {
  try {
    const newPassword = req.body.newpass;
    const usermail = req.session.tempUser.email;
    const hashedPassword = await securepassword(newPassword);
    const updatePassword = await user.findOneAndUpdate(
      { email: usermail },
      {
        $set: { password: hashedPassword },
      }
    );
    if (updatePassword) {
      res.status(200).json({ message: "password updated succesfully" });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).render("error");
  }
};

module.exports = {
  loadHome,
  loadSignup,
  insertUser,
  loadOtp,
  verifyOtp,
  resendOtp,
  resendforgotPasswordOtp,
  verifyMail,
  loadLogin,
  verifyLogin,
  logout,
  loadShop,
  loadProductDetails,
  loadProfile,
  saveUser,
  loadEditUserAddress,
  editAddress,
  changePassword,
  updatePassword,
  editProfile,
  LoadforgotPassword,
  checkEmail,
  LoadforgotPasswordOtp,
  verifyPasswordOtp,
  resetPassword,
};
