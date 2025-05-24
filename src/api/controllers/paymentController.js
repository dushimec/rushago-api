import catchAsyncError from '../helpers/catchAsyncError.js';
import Response from '../helpers/Response.js';
import AppError from '../helpers/appError.js';
import { User, Car, Bill } from '../models/index.js';
import { logUserActivity } from '../utils/globalFeature.js';
import { makePayment, initiateCardPayment, checkPaymentStatus } from '../services/payment.js';
import { sendPaymentConfirmationEmail } from '../services/email.js';
import httpStatus from 'http-status';

export const initiateSubscriptionPayment = catchAsyncError(async (req, res) => {
  const { plan, paymentMethod, phone, userId, card_number, expiry_month, expiry_year, cvv } = req.body;
  if (!plan || !['basic_owner', 'pro_owner'].includes(plan)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid subscription plan');
  }
  if (plan === 'pro_owner' && !paymentMethod) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Payment method is required for pro_owner plan');
  }
  if (paymentMethod && !['momo', 'card'].includes(paymentMethod)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid payment method. Must be "momo" or "card"');
  }
  if (paymentMethod === 'momo' && !phone) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Phone number is required for mobile money payment');
  }
  if (paymentMethod === 'momo' && phone.toString().replace(/\D/g, '').length !== 12) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid phone number format');
  }
  if (paymentMethod === 'card' && card_number && (!card_number || !expiry_month || !expiry_year || !cvv)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Card number, expiry month, expiry year, and CVV are required for direct card payment');
  }

  const user = await User.findById(userId || req.user.id);
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (plan === 'basic_owner') {
    const previousPlan = user.subscription.plan;
    user.subscription.plan = 'basic_owner';
    user.subscription.status = 'active';
    user.subscription.start_date = new Date();
    user.subscription.end_date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    user.subscription.payment_method_id = null;
    user.role.is_owner = true;
    user.subscription.pending_payment = null;
    await user.save();

    const cars = await Car.find({ owner_id: user._id, 'status.is_deleted': false });
    for (const car of cars) {
      car.status.is_active = true;
      car.status.is_featured = false;
      car.ranking = 50;
      car.subscription_boost = {
        start_date: new Date(),
        expiry_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      };
      await car.save();
      await logUserActivity(user._id, 'car_reactivated', { action: 'reactivate_car', target_id: car._id }, {});
    }

    await logUserActivity(user._id, 'subscription_activated', { action: 'activate_subscription', metadata: { plan: user.subscription.plan, previousPlan } }, { device: req.headers['user-agent'] });
    return Response.successMessage(res, 'Subscribed to basic_owner plan successfully', null, httpStatus.OK);
  }

  const amount = 10000;
  const bill = await Bill.create({
    phone,
    amount,
    user: user._id,
    paymentMethod,
    status: 'pending'
  });

  if (paymentMethod === 'momo') {
    const momoData = {
      transactionId: bill.billId,
      account_no: phone,
      amount,
      currency: 'RWF',
      payment_method: 'momo',
    };

    const resData = await makePayment(momoData);
    if (!resData) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Payment failed');
    }

    await Bill.findByIdAndUpdate(
      bill._id,
      { resBody: { ...resData, createdAt: new Date() }, status: resData?.statusCode === 200 ? 'initiated' : 'failed' },
      { new: true }
    );

    user.subscription.pending_payment = { tx_ref: bill.billId, amount, plan, paymentMethod };
    await user.save();

    await logUserActivity(req.user.id, 'subscription_initiated', { action: 'initiate_subscription', metadata: { plan, tx_ref: bill.billId, paymentMethod } }, { device: req.headers['user-agent'] });
    return Response.successMessage(
      res,
      'Mobile money payment initiated. Please complete the payment on your phone.',
      bill,
      resData?.statusCode ?? httpStatus.OK
    );
  }

  if (paymentMethod === 'card') {
    const cardPaymentData = {
      tx_ref: bill.billId,
      amount,
      currency: 'RWF',
      redirect_url: 'http://localhost:15000/api/v1/payments/subscription/redirect',
      customer: {
        email: user.email,
        phonenumber: phone || user.phone,
        name: user.name,
      },
      customizations: {
        title: 'RUSHAGO Payment',
        description: 'Payment for RUSHAGO services',
        logo: 'https://your-logo-url.com/logo.png',
      },
    };

    if (card_number) {
      cardPaymentData.card_details = {
        card_number,
        expiry_month,
        expiry_year,
        cvv
      };
    }

    const cardResponse = await initiateCardPayment(cardPaymentData);
    if (cardResponse.status !== 'success') {
      throw new AppError(httpStatus.BAD_REQUEST, 'Failed to initiate card payment');
    }

    await Bill.findByIdAndUpdate(
      bill._id,
      { resBody: cardResponse.data, status: 'initiated' },
      { new: true }
    );

    user.subscription.pending_payment = { tx_ref: bill.billId, amount, plan, paymentMethod };
    await user.save();

    await logUserActivity(req.user.id, 'subscription_initiated', { action: 'initiate_subscription', metadata: { plan, tx_ref: bill.billId, paymentMethod } }, { device: req.headers['user-agent'] });
    return Response.successMessage(
      res,
      'Card payment initiated successfully',
      { paymentLink: cardResponse.data.link },
      httpStatus.OK
    );
  }
});

export const handlePayment = catchAsyncError(async (req, res) => {
  const { phone, amount, user, paymentMethod } = req.body;

  if (!phone || !amount || !user || !paymentMethod) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Missing required payment fields.');
  }

  if (phone.toString().replace(/\D/g, '').length !== 12) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid phone number format');
  }

  const userRecord = await User.findById(user);
  if (!userRecord) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (!['momo', 'card'].includes(paymentMethod)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid payment method. Must be "momo" or "card"');
  }

  const bill = await Bill.create({ phone, amount, user: userRecord._id, paymentMethod });

  if (paymentMethod === 'momo') {
    const momoData = {
      transactionId: bill.billId,
      account_no: phone,
      amount,
      currency: 'RWF',
      payment_method: 'momo',
    };

    const resData = await makePayment(momoData);
    if (!resData) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Payment failed');
    }

    const updatedBill = await Bill.findByIdAndUpdate(
      bill._id,
      { resBody: { ...resData, createdAt: new Date() }, status: resData?.statusCode === 200 ? 'initiated' : 'failed' },
      { new: true }
    );

    return Response.successMessage(
      res,
      'Payment initiated successfully. Please complete the payment on your phone.',
      updatedBill,
      resData?.statusCode ?? httpStatus.OK
    );
  }

  // For card payments, redirect to payment link
  const cardPaymentData = {
    tx_ref: bill.billId,
    amount,
    currency: 'RWF',
    redirect_url: 'http://localhost:15000/api/v1/payments/callback',
    customer: {
      email: userRecord.email,
      phonenumber: phone || userRecord.phone,
      name: userRecord.name,
    },
    customizations: {
      title: 'RUSHAGO Payment',
      description: 'Payment for RUSHAGO services',
      logo: 'https://your-logo-url.com/logo.png',
    },
  };

  const cardResponse = await initiateCardPayment(cardPaymentData);
  if (cardResponse.status !== 'success') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to initiate card payment');
  }

  const updatedBill = await Bill.findByIdAndUpdate(
    bill._id,
    { resBody: cardResponse.data, status: 'initiated' },
    { new: true }
  );

  return Response.successMessage(
    res,
    'Card payment initiated successfully',
    { bill: updatedBill, paymentLink: cardResponse.data.link },
    httpStatus.OK
  );
});

export const handleCardPayment = catchAsyncError(async (req, res) => {
  const { phone, amount, user, paymentMethod, card_number, expiry_date, cvv } = req.body;

  if (!phone || !amount || !user || !paymentMethod || !card_number || !expiry_date || !cvv) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Missing required card payment fields.');
  }

  if (paymentMethod !== 'card') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid payment method. Must be "card"');
  }

  const userRecord = await User.findById(user);
  if (!userRecord) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (phone.toString().replace(/\D/g, '').length !== 12) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid phone number format');
  }

  const bill = await Bill.create({ phone, amount, user: userRecord._id, paymentMethod });

  const cardPaymentData = {
    transactionId: bill.billId,
    card_number,
    cvv,
    expiry_date,
    phone,
    user: userRecord._id,
    amount,
    currency: 'RWF',
    payment_method: 'card',
  };

  const resData = await makePayment(cardPaymentData);
  if (!resData) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Card payment failed');
  }

  const updatedBill = await Bill.findByIdAndUpdate(
    bill._id,
    { resBody: { ...resData, createdAt: new Date() }, status: resData?.statusCode === 200 ? 'initiated' : 'failed' },
    { new: true }
  );

  return Response.successMessage(
    res,
    'Card payment initiated successfully',
    updatedBill,
    resData?.statusCode ?? httpStatus.OK
  );
});

export const callbackPayment = catchAsyncError(async (req, res) => {
  console.log('Incoming callback request body:', req.body);

  const { tx_ref, status } = req.body;
  if (!tx_ref || !status) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Transaction ID or status is missing.');
  }

  const billData = await Bill.findOne({ billId: tx_ref });
  if (!billData) {
    throw new AppError(httpStatus.NOT_FOUND, 'Bill record not found.');
  }

  // Verify payment status with Flutterwave
  const paymentStatus = await checkPaymentStatus(tx_ref);
  const paymentData = paymentStatus[0];
  if (!paymentData) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to verify payment status.');
  }

  const updatedBill = await Bill.findOneAndUpdate(
    { billId: tx_ref },
    {
      callbackBody: paymentData,
      status: paymentData.status === 200 ? 'completed' : 'failed',
      isDone: paymentData.status === 200 || paymentData.status === 400,
    },
    { new: true }
  );

  return Response.successMessage(res, 'Callback processed successfully', updatedBill, httpStatus.OK);
});

export const handleSubscriptionRedirect = catchAsyncError(async (req, res) => {
  const { status, tx_ref } = req.query;
  if (!tx_ref || !status) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid redirect data');
  }

  const user = await User.findOne({ 'subscription.pending_payment.tx_ref': tx_ref });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User with pending payment not found');
  }

  const bill = await Bill.findOne({ billId: tx_ref });
  if (!bill) {
    throw new AppError(httpStatus.NOT_FOUND, 'Bill not found');
  }

  if (status === 'successful') {
    const paymentStatus = await checkPaymentStatus(tx_ref);
    const paymentData = paymentStatus[0];
    if (paymentData.status !== 200) {
      user.subscription.pending_payment = null;
      bill.status = 'failed';
      await user.save();
      await bill.save();
      throw new AppError(httpStatus.BAD_REQUEST, 'Payment verification failed');
    }

    const previousPlan = user.subscription.plan;
    user.subscription.plan = user.subscription.pending_payment.plan;
    user.subscription.status = 'active';
    user.subscription.start_date = new Date();
    user.subscription.end_date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    user.subscription.payment_method_id = tx_ref;
    user.role.is_owner = true;
    user.subscription.pending_payment = null;

    bill.status = 'completed';
    bill.isDone = true;
    bill.callbackBody = paymentData;
    await bill.save();
    await user.save();

    const cars = await Car.find({ owner_id: user._id, 'status.is_deleted': false });
    for (const car of cars) {
      car.status.is_active = true;
      car.status.is_featured = true;
      car.ranking = 100;
      car.subscription_boost = {
        start_date: new Date(),
        expiry_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      };
      await car.save();
      await logUserActivity(user._id, 'car_reactivated', { action: 'reactivate_car', target_id: car._id }, {});
    }

    await sendPaymentConfirmationEmail(user.email, user.name, user.subscription.plan, paymentData.amount);
    await logUserActivity(user._id, 'subscription_activated', { action: 'activate_subscription', metadata: { plan: user.subscription.plan, previousPlan } }, { device: req.headers['user-agent'] });
    return Response.successMessage(res, 'Subscription activated successfully', null, httpStatus.OK);
  }

  user.subscription.pending_payment = null;
  bill.status = 'failed';
  await user.save();
  await bill.save();
  return Response.errorMessage(res, 'Payment failed or cancelled', httpStatus.BAD_REQUEST);
});

export const handlePaymentRedirect = catchAsyncError(async (req, res) => {
  const { status, tx_ref } = req.query;
  if (!tx_ref || !status) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid redirect data');
  }

  const bill = await Bill.findOne({ billId: tx_ref });
  if (!bill) {
    throw new AppError(httpStatus.NOT_FOUND, 'Bill not found');
  }

  if (status === 'successful') {
    const paymentStatus = await checkPaymentStatus(tx_ref);
    const paymentData = paymentStatus[0];
    if (paymentData.status !== 200) {
      bill.status = 'failed';
      bill.isDone = true;
      await bill.save();
      throw new AppError(httpStatus.BAD_REQUEST, 'Payment verification failed');
    }

    bill.status = 'completed';
    bill.isDone = true;
    bill.callbackBody = paymentData;
    await bill.save();

    return Response.successMessage(res, 'Payment completed successfully', bill, httpStatus.OK);
  }

  bill.status = 'failed';
  bill.isDone = true;
  await bill.save();
  return Response.errorMessage(res, 'Payment failed or cancelled', httpStatus.BAD_REQUEST);
});

export const checkPaymentStatusHandler = catchAsyncError(async (req, res) => {
  const data = await checkPaymentStatus(req.body.transactionId);
  if (!data) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to get payment status');
  }
  return Response.successMessage(res, 'Success', data, httpStatus.OK);
});

export const verifySpecificPayment = catchAsyncError(async (req, res) => {
  const transactionId = req.params.id;
  console.log('Checking payment status for transaction ID:', transactionId);
  const data = await checkPaymentStatus(transactionId);
  console.log('Payment status response:', data);

  const billData = await Bill.findOneAndUpdate(
    { billId: data[0]?.transactionId },
    {
      callbackBody: data[0] ?? {},
      status: data[0]?.status,
      isDone: data[0]?.status === 200,
    }
  );

  const user = await User.findOne({ 'subscription.pending_payment.tx_ref': data[0]?.transactionId });
  if (user && data[0]?.status === 200 && billData.status !== 'completed') {
    const previousPlan = user.subscription.plan;
    user.subscription.plan = user.subscription.pending_payment.plan;
    user.subscription.status = 'active';
    user.subscription.start_date = new Date();
    user.subscription.end_date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    user.subscription.payment_method_id = data[0]?.transactionId;
    user.role.is_owner = true;
    user.subscription.pending_payment = null;
    await user.save();

    const cars = await Car.find({ owner_id: user._id, 'status.is_deleted': false });
    for (const car of cars) {
      car.status.is_active = true;
      car.status.is_featured = true;
      car.ranking = 100;
      car.subscription_boost = {
        start_date: new Date(),
        expiry_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      };
      await car.save();
      await logUserActivity(user._id, 'car_reactivated', { action: 'reactivate_car', target_id: car._id }, {});
    }

    await sendPaymentConfirmationEmail(user.email, user.name, user.subscription.plan, data[0]?.amount);
    await logUserActivity(user._id, 'subscription_activated', { action: 'activate_subscription', metadata: { plan: user.subscription.plan, previousPlan } }, {});
  }

  const updatedBill = await Bill.findById(billData._id);
  return Response.successMessage(res, 'Success', updatedBill, httpStatus.OK);
});

export const getAllRevenueTotal = catchAsyncError(async (req, res) => {
  const revenue = await Bill.aggregate([
    {
      $match: {
        isDone: true,
        status: 'completed',
      },
    },
    {
      $group: {
        _id: null,
        totalAmount: {
          $sum: '$amount',
        },
      },
    },
  ]);

  return Response.successMessage(res, 'Success', revenue, httpStatus.OK);
});

// Manage Bill Transactions
export const getAllBills = catchAsyncError(async (req, res) => {
  const bills = await Bill.find().populate('user', 'name email');
  return Response.successMessage(res, 'Success', bills, httpStatus.OK);
});

export const getAllBillsById = catchAsyncError(async (req, res) => {
  const bill = await Bill.findById(req.params.id).populate('user', 'name email');
  if (!bill) {
    throw new AppError(httpStatus.NOT_FOUND, 'Bill not found');
  }
  return Response.successMessage(res, 'Success', bill, httpStatus.OK);
});

export const deleteOneById = catchAsyncError(async (req, res) => {
  const bill = await Bill.findByIdAndDelete(req.params.id);
  if (!bill) {
    throw new AppError(httpStatus.NOT_FOUND, 'Bill not found');
  }
  return Response.successMessage(res, 'Bill deleted successfully', null, httpStatus.OK);
});

export const verifyNotDonePayments = async () => {
  try {
    const allBillsPending = await Bill.find({ isDone: false }).limit(10);
    if (allBillsPending.length < 1) {
      return;
    }
    const data = await checkPaymentStatus({
      external_transaction_id: allBillsPending.map(bill => bill.billId),
    });

    const selectedIds = allBillsPending.map(d => d._id);
    if (data.length < 1) {
      await Bill.updateMany(
        { _id: { $in: selectedIds }, isDone: false },
        { isDone: true }
      );
      return;
    }

    for (const _data of data) {
      const billData = await Bill.findOneAndUpdate(
        { billId: _data.transactionId },
        {
          callbackBody: _data,
          status: _data.status === 200 ? 'completed' : 'failed',
          isDone: _data.status === 200 || _data.status === 400,
        }
      );

      const user = await User.findOne({ 'subscription.pending_payment.tx_ref': _data.transactionId });
      if (user && _data.status === 200 && billData.status !== 'completed') {
        const previousPlan = user.subscription.plan;
        user.subscription.plan = user.subscription.pending_payment.plan;
        user.subscription.status = 'active';
        user.subscription.start_date = new Date();
        user.subscription.end_date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        user.subscription.payment_method_id = _data.transactionId;
        user.role.is_owner = true;
        user.subscription.pending_payment = null;
        await user.save();

        const cars = await Car.find({ owner_id: user._id, 'status.is_deleted': false });
        for (const car of cars) {
          car.status.is_active = true;
          car.status.is_featured = true;
          car.ranking = 100;
          car.subscription_boost = {
            start_date: new Date(),
            expiry_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
          };
          await car.save();
          await logUserActivity(user._id, 'car_reactivated', { action: 'reactivate_car', target_id: car._id }, {});
        }

        await sendPaymentConfirmationEmail(user.email, user.name, user.subscription.plan, _data.amount);
        await logUserActivity(user._id, 'subscription_activated', { action: 'activate_subscription', metadata: { plan: user.subscription.plan, previousPlan } }, {});
      }
    }
    console.log(` --------------------------------${allBillsPending.length} Bills updated!!! --------------------------------`);
  } catch (error) {
    console.log('----------------- Error! ---------------');
    console.log(error);
  }
};