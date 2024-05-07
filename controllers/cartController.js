const cart = require('../models/cartModel');
const products = require('../models/productModel');
const user=require('../models/userModel');
const wishlist=require('../models/wishlistModel');


const loadCart = async (req, res) => {
    try {
      const userId = req.session.userId;
  
    //   if (!req.session.outOfStock) {
    //     req.session.outOfStock = null
    //   }
  
      if (!userId) {
        res.redirect('/login');
      } else {
        // Fetch cart details
        // const cartDetails = await cart.findOne({ user_id: userId }).populate({
        //   path: 'items.product_id',
        //   populate: [
        //     { path: 'offer' },
        //     {
        //       path: 'categoryId',
        //       populate: { path: 'offer' } // Populate the offer field in the Category model
        //     }
        //   ]
        // });
        const cartDetails = await cart.findOne({ user: userId }).populate('products.productID');
          //console.log('iamcartdetails', cartDetails);
  
        const userData = await user.findOne({ _id: userId });
          
  
        // Check if cartDetails is truthy before accessing its properties
        // const cartItems = cartDetails ? cartDetails.products : [];
        // var inStock = ''
  
        // for (const cartItem of cartItems) {
        //   if (cartItem.quantity > cartItem.product_id.stockQuantity) {
        //     inStock = 'outOfStock';
        //     break; // Exit the loop if any item is out of stock
        //   }
        // }
  
        // req.session.outOfStock = inStock
        // let sessionStock = req.session.outOfStock
  
        let originalAmts = 0;
  
        // if (cartDetails) {
        //   cartDetails.products.forEach((cartItem) => {
        //     let itemPrice = cartItem.productID.Price;  // Adjust the property based on your data model
        //     originalAmts += itemPrice * cartItem.productID.quantity;
        //   });
        // }
        if (cartDetails) {

            cartDetails.products.forEach((cartItem) => {
            let itemPrice = cartItem.productID.Prize;
            let itemQuantity = cartItem.quantity;
            // console.log("itemPrice:", itemPrice); // Log itemPrice to check its value
            // console.log("itemQuantity:", itemQuantity); // Log itemQuantity to check its value
            originalAmts += itemPrice * itemQuantity;
            });
        }
        //console.log("originalAmts",originalAmts)
        console.log(cartDetails.products);
        res.render('shopping-cart', { user: userData, cartProducts: cartDetails, subtotal: originalAmts });
      }
    } catch (error) {
      console.log(error.message);
      //res.status(500).render('serverError', { message: error.message });
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
                    console.log('Product already exists');
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
                        console.log('Successfully added to cart');
                        res.status(200).json({ success: true, message: 'Successfully added to cart', value: 2 });
                    } else {
                        console.log('Failed to add to cart');
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
                    console.log('Successfully added to cart');
                    res.status(200).json({ success: true, message: 'Successfully added to cart', value: 2 });
                } else {
                    console.log('Failed to add to cart');
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
        res.render('wishlist',{wishlistProducts})

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
    loadCart,
    addToCart,
    incrementQuantity,
    decrementQuantity,
    removeProduct,
    Loadwishlist,
    addToWishlist
}