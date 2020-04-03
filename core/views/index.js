var express = require('express');
const check = require('express-validator/check').check;
const validationResult = require('express-validator/check').validationResult;
var router = express.Router();
var jobService = require('../services/job.service');
var applicantService = require("../services/applicant.service");
var User = require('../models/user');
var multer = require('multer');

router.get("", async (req, res) => {
    try {
        var jobs = await jobService.getPublishedJobs();
        res.render('pages/jobs', { jobs: jobs });
    } catch (err) {
        res.render('pages/error')
    }
});

router.get("/apply/:id", async (req, res) => {
    try {
        var job = await jobService.getByGuid(req.params.id);
        res.render('pages/apply', { job: job });
    } catch (err) {
        res.render('pages/error')
    }
});

router.get("/:id", async (req, res) => {
    try {
        var job = await jobService.getByGuid(req.params.id);
        res.render('pages/job', { job: job });
    } catch (err) {
        res.render('pages/error')
    }
});

var resume = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1000 * 1000 * 12 } });
router.post("/apply/:id", 
[
    // password must be at least 5 chars long
    check('name').not().isEmpty(),
    // username must be an email
    check('email').not().isEmpty().isEmail().normalizeEmail(),
    // password must be at least 5 chars long
    check('phone').not().isEmpty().isLength({ min: 10 }),
    // password must be at least 5 chars long
    check('resume').not().isEmpty(),
    // password must be at least 5 chars long
    check('availability').not().isEmpty()
], 
resume.any(),
async (req, res) => {
    // Finds the validation errors in this request and wraps them in an object with handy functions
    const errors = validationResult(req.body);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    }

    try {
        console.log(req.body);
        let admin = await User.findOne({ email: 'admin@eazyrecruit.in' }, { select: 'email' });
        if (admin) {
            req.user = {
                id: admin.id
            }
        }
        let result = await applicantService.save(req);
        //if (err) res.render('pages/error');
        //else res.render('pages/thanks', { job: data });
        res.render('pages/thanks');        
    } catch (error) {
        res.render('pages/thanks');
    }
});

module.exports.pages = router;