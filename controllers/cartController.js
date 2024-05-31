const cart = require('../models/cartModel');
const products = require('../models/productModel');
const user=require('../models/userModel');
const wishlist=require('../models/wishlistModel');


const checkCart = async (req, res) => {
    try {
        if (req.session.user) {
            res.status(200).json({ message: 'user is there ', value: 1 });
        } else {
            res.status(200).json({ message: 'please login ', value: 2 });
        }
    } catch (error) {
        console.log(error.message);
        res.status(500).render('error')
    }
}



const loadCart = async (req, res) => {
    try {
        const userId = req.session.userId;

        if (!userId) {
            res.redirect('/login');
        } else {
            // Fetch cart details
            let cartDetails = await cart.findOne({ user: userId }).populate('products.productID');

            if (!cartDetails) {
                // Initialize an empty cart if none exists
                cartDetails = { products: [] };
            }

            const userData = await user.findOne({ _id: userId });

            let originalAmts = 0;

            if (cartDetails.products.length > 0) {
                cartDetails.products.forEach((cartItem) => {
                    let itemPrice = cartItem.productID.Prize;
                    let itemQuantity = cartItem.quantity;
                    originalAmts += itemPrice * itemQuantity;
                });
            }

            res.render('shopping-cart', { user: userData, cartProducts: cartDetails, subtotal: originalAmts });
        }
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};




  


const addToCart = async (req, res) => {
    try {
        const userData = req.session.user;
        const productID = req.body.productId;
        const prize = req.body.prize;
        const userID = userData._id;

        try {
            // Check if the user has a cart
            const userCart = await cart.findOne({ user: userID });

            if (userCart) {
                // Check if the product already exists in the cart
                const checkProduct = userCart.products.find(item => item.productID.equals(productID));

                if (checkProduct) {
                    res.status(200).json({ success: false, message: 'Product already exists in the cart', value: 1 });
                } else {
                    // Add the new product to the existing cart if the product does not exist
                    const newProduct = {
                        productID: productID,
                        quantity: 1,
                        total: prize
                    };

                    userCart.products.push(newProduct);
                    const updatedCart = await userCart.save();

                    if (updatedCart) {
                        res.status(200).json({ success: true, message: 'Successfully added to cart', value: 2 });
                    } else {
                        res.status(500).json({ success: false, error: 'Failed to add to cart', value: 3 });
                    }
                }
            } else {
                // If the user doesn't have a cart, create a new one
                const newCart = new cart({
                    user: userID,
                    products: [{
                        productID: productID,
                        quantity: 1,
                        total: prize
                    }]
                });

                const savedCart = await newCart.save();

                if (savedCart) {
                    res.status(200).json({ success: true, message: 'Successfully added to cart', value: 2 });
                } else {
                    res.status(500).json({ success: false, error: 'Failed to add to cart', value: 3 });
                }
            }
        } catch (error) {
            console.error('Error:', error.message);
            res.status(500).json({ success: false, error: 'Internal server error', value: 3 });
        }


    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error', value: 3 });
    }
};


const incrementQuantity = async (req, res) => {

    try {
        const productID = req.body.productId
        const total = req.body.total;
        const currentQuantity = req.body.currentQuantity + 1
        const user = req.session.user._id;
        const result = await cart.updateOne(
            { user, "products.productID": productID },
            { $set: { "products.$.quantity": currentQuantity, "products.$.total": total } }
        );
        if (result) {
            res.status(200).json({ message: 'updated succesfully' })
        }
    } catch (error) {

        res.status(500).render('error')
    }
}




const decrementQuantity = async (req, res) => {

    try {
        const productID = req.body.productId
        const total = req.body.total
        const currentQuantity = req.body.currentQuantity - 1
        const user = req.session.user._id;
        const result = await cart.updateOne(
            { user, "products.productID": productID },
            { $set: { "products.$.quantity": currentQuantity, "products.$.total": total } }
        );
        if (result) {
            res.status(200).json({ message: 'updated succesfully' })
        }

    } catch (error) {

        res.status(500).render('error')
    }
}

const removeProduct = async (req, res) => {
    try {
        const productId = req.body.productID
        const userID = req.session.user._id

        const findcart = await cart.findOneAndUpdate({ user: userID }, {
            $pull: {
                products: { productID: productId }
            }
        })

        if (findcart) {
            res.status(200).json({ message: 'succefully removed from cart' })
        }
    } catch (error) {

        res.status(500).render('error')
    }
}



const Loadwishlist = async (req, res) => {
    try {
        const id = req.session.user._id;
        const wishlistProducts = await wishlist.findOne({ userId: id }).populate('wishlistProducts')
        
        res.render('wishlist',{wishlistProducts,user:req.session.user})

    } catch (error) {

        res.status(500).render('error')
    }
}

const addToWishlist = async (req, res) => {
    try {
        const productid = req.body.productID;
        const userid = req.session.user._id;

        if (!userid) {
            return res.status(200).json({ message: 'No session found', value: 3 });
        }

        const findWishlist = await wishlist.findOne({ userId: userid });

        if (findWishlist) {
            const isProductInWishlist = await wishlist.findOne({ wishlistProducts: productid });

            if (isProductInWishlist) {
                return res.status(200).json({ message: 'Product already exists in the wishlist', value: 0 });
            }

            findWishlist.wishlistProducts.push(productid);
            const updatedWishlist = await findWishlist.save();
            return res.status(200).json({ message: 'Added to wishlist', value: 1 });
        }

        const newWishlist = new wishlist({
            userId: userid,
            wishlistProducts: [productid]
        });

        const savedWishlist = await newWishlist.save();

        if (savedWishlist) {
            return res.status(200).json({ message: 'Added to wishlist', value: 1 });
        }
    } catch (error) {
        console.error(error.message);
        return res.status(200).json({ message: 'Added to wishlist', value: 2 });
    }
};




module.exports={
    checkCart,
    loadCart,
    addToCart,
    incrementQuantity,
    decrementQuantity,
    removeProduct,
    Loadwishlist,
    addToWishlist
}