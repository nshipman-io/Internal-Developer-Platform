import express, {Express, Router} from "express";
import {EnvironmentsController} from "../controllers/environments";



export const router = express.Router();

const controller = new EnvironmentsController();

router.get("/", (req, res) => controller.getAllEnvironments(req,res));
router.post("/", (req, res) => controller.createEnvironment(req,res));
router.delete("/:name", (req, res) =>controller.deleteEnvironment(req,res));