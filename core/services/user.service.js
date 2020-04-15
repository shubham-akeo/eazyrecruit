var mail = require('./email.service');
const uuidv4 = require('uuid/v4');
var bcrypt = require('bcrypt-nodejs');
var User = require('../models/user');
var Role = require('../models/userRole');
var emailService = require('../services/email.service');

exports.getRoles = async () => {
    return await Role.find({ is_deleted: false });
};

exports.getUsers = async () => {
    return await User.find({ is_deleted: false }).populate('roles');
};

exports.register = async (req) => {
    return new Promise(async (resolve, reject) => {
        try {
            let user = await User.find({ email: req.body.email, is_deleted: false });
            if (user && user.length) {
                resolve(`${req.body.email} already exist`);
            } else {
                try {
                    //create user
                    let otp = uuidv4();
                    let userModel = new User();
                    userModel.name = `${req.body.firstName} ${req.body.lastName}`
                    userModel.email = req.body.email;
                    userModel.firstName = req.body.firstName;
                    userModel.lastName = req.body.lastName;
                    roles = req.body.roleId,
                    phone = [req.body.phone],
                    passwordResetToken = otp,
                    passwordResetExpires = new Date(),
                    emailVerificationToken = '',
                    emailVerified = false,
                    google = false,
                    tokens = [],
                    picture = '',
                    is_deleted = false,
                    created_by = req.user.id,
                    created_at = new Date(),
                    modified_by = req.user.id,
                    modified_at = new Date();
                    await userModel.save();
        
                    //send email
                    let email = {};
                    email.name = userModel.firstName ? `${userModel.firstName} ${userModel.lastName}` : req.body.email;
                    email.receiverAddress = userModel.email;
                    email.subject = 'Registration successfull';
                    email.body = `Please use below link to reset your password.<br/><a href="${req.headers.origin}/admin/resetpassword/${otp}">Reset Password</a>`;
                    try {
                        await emailService.sendEmail(email);
                        resolve(`An email has been sent to ${email.receiverAddress} for user registration.`);
                    } catch (error) {
                        let err = {
                            status: 500,
                            message: 'internal server error'
                        }
                        console.log('user registration email error : ', error);
                        reject(err); 
                    }
                    // emailService.sendEmail(email, (err, data) => {
                    //     if (err) {
                    //         let err = {
                    //             status: 500,
                    //             message: 'internal server error'
                    //         }
                    //         console.log('user registration email error : ', error);
                    //         return err;
                    //     } else {
                    //         return `An email has been sent to ${email.receiverAddress} for user registration.`;
                    //     }
                    // });
                } catch (error) {
                    let err = {
                        status: 500,
                        message: 'internal server error'
                    }
                    console.log('create user : ', error);
                    reject(err);
                }
            }   
        } catch (error) {
            reject(error);
        }        
    });
};