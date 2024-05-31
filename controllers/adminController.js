const user=require('../models/userModel');
const users=require('../models/userModel');
const bcrypt=require("bcrypt");
const productModel = require('../models/productModel');
const orderModel = require('../models/orderModel')
const moment = require('moment');;


const loadAdminLogin = async (req, res) => {
    try {
      res.render('adminLogin')
    } catch (error) {
      console.log(error.message);
      res.status(500).render('serverError', { message: error.message });
    }
}

const verifyAdminLogin = async (req, res) => {
  try {

      const { email, password } = req.body
      const findAdmin = await user.findOne({ email: email });

      if (findAdmin) {

          const  passwordMatch = await bcrypt.compare(password, findAdmin.password);

          if (passwordMatch) {

              if (findAdmin.is_admin === 0) {
                  res.render('adminLogin', { message1: 'oops! looks like you are not an admin' })
              } else {
                  req.session.admin = findAdmin
                  req.session.admin._id = findAdmin._id;
                  res.redirect('/admin/adminHome')
              }

          }
          else {

              const message = 'invalid password'
              res.render('adminLogin', { message });
          }


      } else {

          res.render('adminLogin', { message1: 'email is not found' });
      }

  } catch (error) {
      console.log(error.message);
      res.status(500).render('error')

  }
}

const adminLogout = async (req, res) => {
  try {
      req.session.destroy()
      res.redirect('/admin/login')
  } catch (error) {

      console.log(error);
      res.status(500).render('error')

  }
}


  const loadAdminHome = async (req, res) => {
    try {
          res.render('adminHome');
    } catch (error) {
        console.log(error.message);
        res.status(500).render('serverError', { message: error.message });
    }
};


const loadDashboard = async (req, res) => {
    try {
        const topProduct = await orderModel.aggregate([
            { $unwind: "$items" },  
            {
              $lookup: {
                from: "products",
                localField: "items.productID",
                foreignField: "_id",
                as: "productDetails",
              },
            },
            {
              $group: {
                _id: "$items.productID",
                productName: { $first: "$productDetails.productName" },
                totalQuantitySold: { $sum: "$items.quantity" },
              },
            },
            { $project: { _id: 0, productName: 1, totalQuantitySold: 1 } },
            { $sort: { totalQuantitySold: -1 } },
            { $limit: 10 },
          ]);
          const topCategory = await orderModel.aggregate([
            { $unwind: "$items" },  
            {
              $lookup: {
                from: "products",
                localField: "items.productID",
                foreignField: "_id",
                as: "productDetails",
              },
            },
            { $unwind: "$productDetails" },  
            {
              $lookup: {
                from: "categories",
                localField: "productDetails.category",
                foreignField: "_id",
                as: "categoryDetails",
              },
            },
            { $unwind: "$categoryDetails" },  
            {
              $group: {
                _id: "$categoryDetails.categoriesName", 
                totalQuantitySold: { $sum: "$items.quantity" },
              },
            },
            { $sort: { totalQuantitySold: -1 } },
            { $limit: 10 },
          ]);
          
        res.render('dashboard',{topProduct,topCategory})

    } catch (error) {
        console.log(error.message);

    }
}

const postChangeUserStatus = async (req, res, next) => {
    try {
  
      const { userId } = req.body
      await user.updateOne({ _id: userId }, { $set: { is_blocked: true } })
      res.json({ success: true })
  
    } catch (error) {
      console.log(error.message);
      res.status(500).render('serverError', { message: error.message });
      next(error)
    }
  }
  const postUnblockUser = async (req, res, next) => {
    try {
      const { userId } = req.body
      await user.updateOne({ _id: userId }, { $set: { is_blocked: false } })
      res.json({ unblocked: true })
  
    } catch (error) {
      console.log(error.message);
      res.status(500).render('serverError', { message: error.message });
      next(error)
    }
  }


const loadUsers = async (req,res)=>{
    try {
        const userData= await user.find({is_admin:0});
        res.render('users', {user : userData});
    } catch (error) {
        res.status(500).render('error')
        console.log(error.message);
    }
}














const salesData = async (req, res) => {
  try {
      const totalusers = await user.find({ is_admin: 0 }).count();
      const totalProducts = await productModel.find().count();
      const totalorders = await orderModel.find().count();
      const totalrevenue = await orderModel.aggregate([{ $group: { _id: null, totalRevenue: { $sum: "$totalAmount" } } }]);
      let totalRevenue = 0;
      if (totalrevenue.length > 0) {
          [{ totalRevenue }] = totalrevenue;
      }
      const paymentSalesData = await orderModel.aggregate([
          {
              $match: {
                  paymentMethod: { $in: ["cod", "Net Banking"] },
                  // Add any additional conditions if needed
              },
          },
          {
              $group: {
                  _id: "$paymentMethod",
                  totalAmount: { $sum: "$totalAmount" },
                  orderCount: { $sum: 1 },
              },
          },
          {
              $project: {
                  _id: 0,
                  label: "$_id",
                  totalAmount: 1,
                  orderCount: 1,
              },
          },
      ]);

      ///////////////////////////////  daily orders  ////////////////////////////////

      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to the beginning of today

      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999); // Set to the end of today
      const todaysOrders = await orderModel.aggregate([
          {
              $match: {
                  orderStatus: "ordered",
                  orderDate: {
                      $gte: today,
                      $lt: endOfDay,
                  },
              },
          },
          {
              $group: {
                  _id: null,
                  today: { $first: { $dateToString: { format: "%Y-%m-%d", date: today } } },
                  orderCount: { $sum: 1 },
              },
          },
          {
              $project: {
                  _id: 0,
                  today: 1,
                  orderCount: 1,
              },
          },
      ]);

      const todaySales = {
          orderCount: [],
      };



      todaySales.orderCount = todaysOrders.map(({ orderCount }) => orderCount);

      ///////////////////// weekly orders  /////////////////////////////////

      const weeklyOrders = await orderModel.aggregate([
          {
              $project: {
                  orderDate: 1,
                  totalAmount: 1,
                  year: { $year: "$orderDate" },
                  week: { $week: "$orderDate" },
              },
          },
          {
              $group: {
                  _id: { year: "$year", week: "$week" },
                  fromDate: { $min: "$orderDate" },
                  toDate: { $max: "$orderDate" },
                  totalSales: { $sum: "$totalAmount" },
                  orderCount: { $sum: 1 }, // Count the number of orders
              },
          },
          {
              $project: {
                  _id: 0,
                  dateRange: {
                      $concat: [
                          { $dateToString: { format: "%Y-%m-%d", date: "$fromDate" } },
                          " to ",
                          { $dateToString: { format: "%Y-%m-%d", date: "$toDate" } },
                      ],
                  },
                  totalSales: 1,
                  orderCount: 1,
              },
          },
          {
              $sort: { fromDate: 1 },
          },
          {
              $limit: 6,
          },
      ]);


      const weeklySales = {
          totalAmount: 0,
          orderCount: [],
          label: [],
      };

      weeklySales.totalAmount = weeklyOrders.reduce((acc, { totalAmount }) => {
          return acc + Number(totalAmount);
      }, 0);

      weeklySales.orderCount = weeklyOrders.map(({ orderCount }) => orderCount);
      weeklySales.label = weeklyOrders.map(({ label }) => label);


      /////////////////////////////////////////////////    monthly orders  ///////////////////////////////////////////////////////


      const monthlyorders = await orderModel.aggregate([
          {
              $group: {
                  _id: {
                      year: { $year: "$orderDate" },
                      month: { $month: "$orderDate" },
                  },
                  totalSales: { $sum: "$totalAmount" },
                  orderCount: { $sum: 1 },
              },
          },
          {
              $project: {
                  _id: 0,
                  year: "$_id.year",
                  month: {
                      $switch: {
                          branches: [
                              { case: { $eq: ["$_id.month", 1] }, then: "January" },
                              { case: { $eq: ["$_id.month", 2] }, then: "February" },
                              { case: { $eq: ["$_id.month", 3] }, then: "March" },
                              { case: { $eq: ["$_id.month", 4] }, then: "April" },
                              { case: { $eq: ["$_id.month", 5] }, then: "May" },
                              { case: { $eq: ["$_id.month", 6] }, then: "June" },
                              { case: { $eq: ["$_id.month", 7] }, then: "July" },
                              { case: { $eq: ["$_id.month", 8] }, then: "August" },
                              { case: { $eq: ["$_id.month", 9] }, then: "September" },
                              { case: { $eq: ["$_id.month", 10] }, then: "October" },
                              { case: { $eq: ["$_id.month", 11] }, then: "November" },
                              { case: { $eq: ["$_id.month", 12] }, then: "December" },
                          ],
                          default: null,
                      },
                  },
                  totalSales: 1,
                  orderCount: 1,
              },
          },
      ]);

      const monthlySales = {
          totalSales: 0,
          orderCount: [],
          month: [],
      };

      monthlySales.totalSales = monthlyorders.reduce((acc, { totalSales }) => {
          return acc + Number(totalSales);
      }, 0);

      monthlySales.orderCount = monthlyorders.map(({ orderCount }) => orderCount);
      monthlySales.month = monthlyorders.map(({ month }) => month);

      //////////////////////////////////   yearly orders ///////////////////////////////////

      const yearlyOrders = await orderModel.aggregate([
          {
              $group: {
                  _id: {
                      year: { $year: "$orderDate" },
                  },
                  totalSales: { $sum: "$totalAmount" },
                  orderCount: { $sum: 1 },
              },
          },
          {
              $project: {
                  _id: 0,
                  year: "$_id.year",
                  totalSales: 1,
                  orderCount: 1,
              },
          },
      ]);

      const yearlySales = {
          totalSales: 0,
          orderCount: [],
          year: [],
      };

      yearlySales.totalSales = yearlyOrders.reduce((acc, { totalSales }) => {
          return acc + Number(totalSales);
      }, 0);

      yearlySales.orderCount = yearlyOrders.map(({ orderCount }) => orderCount);
      yearlySales.year = yearlyOrders.map(({ year }) => year);


      res.json({
          totalusers,
          totalProducts,
          totalorders,
          totalRevenue,
          paymentSalesData,
          todaySales,
          weeklySales,
          monthlySales,
          yearlySales
      });

  } catch (error) {
      console.log(error.message);
      res.status(500).render('error')

  }
};


const LoadSalesReport = async (req, res) => {
  try {

      res.render('salesReportPage')
  } catch (error) {

      console.log(error.message);
      res.status(500).render('error')

  }
}


const getSalesData = async (req, res) => {
    try {

        const { startdate, endDate } = req.body
        if (!startdate && !endDate) {
            return res.status(400).json({ message: 'please selecet an date ', value: 1 });
        } else {
            const salesdata = await orderModel
                .find({
                    orderDate: {
                        $gte: new Date(startdate),
                        $lte: new Date(endDate)
                    }
                }).populate('shippingAddress').populate('customerID');
             
                const StringSalesData = salesdata.map(order => ({
                id: order.id.toString(),
                customerID: order.customerID ? order.customerID.firstName : 'N/A',
                // customerID: order.customerID.firstName,
                state: order.shippingAddress ? order.shippingAddress.state : 'N/A', // Check if shippingAddress exists
                town: order.shippingAddress ? order.shippingAddress.town : 'N/A',
                streetAddress: order.shippingAddress ? order.shippingAddress.streetAddress : 'N/A',
                houseName: order.shippingAddress ? order.shippingAddress.houseName : 'N/A',
                country: order.shippingAddress ? order.shippingAddress.country : 'N/A',
                zipcode: order.shippingAddress ? order.shippingAddress.zipcode : 'N/A',
                // state: order.shippingAddress.state,
                // town: order.shippingAddress.town,
                // streetAddress: order.shippingAddress.streetAddress,
                // houseName: order.shippingAddress.houseName,
                // country: order.shippingAddress.country,
                // zipcode: order.shippingAddress.zipcode,
                orderStatus: order.orderStatus,
                paymentMethod: order.paymentMethod,
                orderDate: order.orderDate.toLocaleDateString(),
                updateAt: order.updatedAt.toLocaleDateString(),
                trackId: order.trackID.toString(),
                totalAmount : order.totalAmount
            }))
           return res.status(200).json({StringSalesData});
        }

    } catch (error) {

        console.log(error.message);
        res.status(500).render('error')

    }
}


module.exports={
    loadAdminLogin,
    verifyAdminLogin,
    adminLogout,
    loadAdminHome,
    loadDashboard,
    loadUsers,
    postChangeUserStatus,
    postUnblockUser,
    salesData,
    LoadSalesReport,
    getSalesData


}