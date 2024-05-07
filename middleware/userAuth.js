const User = require('../models/userModel');



// const isLogin = async (req, res, next) => {
//     try {
//         if (req.session.userId) {
//             // User is logged in, proceed to the next middleware or route handler
//             next();
//         } else {
//             // User is not logged in, redirect to the root URL ('/')
//             res.redirect('/');
//         }
//     } catch (error) {
//         console.log(error.message);
//     }
// };

// const isLogout = async (req, res, next) => {
//     try {
//         if (req.session.userId) {
//             // User is logged in, redirect to the home page ('/home')
//             res.redirect('/home');
//         } else {
//             // User is not logged in, proceed to the next middleware or route handler
//             next();
//         }
//     } catch (error) {
//         console.log(error.message);
//     }
// };

// module.exports = {
//     isLogin,
//     isLogout
// };



const isLoggedIn = async (req, res, next) => {
    try {
        
        if (req.session.user) {

        

            const userId = req.session.user._id;
            const userdata = await User.findById(userId);

            if (!userdata) {
                return res.redirect('/login')
            }
            
            if (userdata.is_blocked) {
                console.log('user is blocked');
                return res.status(403).render('404',);
            }
           next()

        } else {
            next()
        }

    } catch (error) {
        console.log(error.message);
    }
};




const isLoggedOut = async (req, res, next) => {
    try {
        if (req.session.user) {
            res.redirect('/home');
        } else {
            next();
        }
    } catch (error) {
        console.log(error.message);
    }
};


module.exports = {
    isLoggedIn,
    isLoggedOut,
};
