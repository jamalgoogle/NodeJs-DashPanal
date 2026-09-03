const Employee = require('../model/Employee');

const getAllEmployees = async (req, res) => {
    try {
        const employees = await Employee.find();
        res.json(employees || []);
    } catch (err) {
        res.status(500).json({ 'message': err.message });
    }
}

const createNewEmployee = async (req, res) => {
    if (!req?.body?.firstname || !req?.body?.lastname) {
        return res.status(400).json({ 'message': 'First and last names are required' });
    }

    try {
        const result = await Employee.create({
            firstname: req.body.firstname,
            lastname: req.body.lastname
        });

        res.status(201).json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ 'message': err.message });
    }
}

const updateEmployee = async (req, res) => {
    if (!req?.body?.id) {
        return res.status(400).json({ 'message': 'ID parameter is required.' });
    }

    try {
        const employee = await Employee.findOne({ _id: req.body.id }).exec();
        if (!employee) {
            return res.status(404).json({ "message": `No employee matches ID ${req.body.id}.` });
        }
        if (req.body?.firstname) employee.firstname = req.body.firstname;
        if (req.body?.lastname) employee.lastname = req.body.lastname;
        const result = await employee.save();
        res.json(result);
    } catch (err) {
        res.status(500).json({ 'message': err.message });
    }
}

const deleteEmployee = async (req, res) => {
    if (!req?.body?.id) return res.status(400).json({ 'message': 'Employee ID required.' });

    try {
        const employee = await Employee.findOne({ _id: req.body.id }).exec();
        if (!employee) {
            return res.status(404).json({ "message": `No employee matches ID ${req.body.id}.` });
        }
        const result = await employee.deleteOne();
        res.json(result);
    } catch (err) {
        res.status(500).json({ 'message': err.message });
    }
}

const getEmployee = async (req, res) => {
    if (!req?.params?.id) return res.status(400).json({ 'message': 'Employee ID required.' });

    try {
        const employee = await Employee.findOne({ _id: req.params.id }).exec();
        if (!employee) {
            return res.status(404).json({ "message": `No employee matches ID ${req.params.id}.` });
        }
        res.json(employee);
    } catch (err) {
        res.status(500).json({ 'message': err.message });
    }
}

module.exports = {
    getAllEmployees,
    createNewEmployee,
    updateEmployee,
    deleteEmployee,
    getEmployee
}