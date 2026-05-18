/**
 * Modèle de base générique pour les 4 rôles utilisateurs VAN BTP.
 * Inspiré du pattern de l'exemple backend_rh.
 * Chaque rôle (DG, Chef, Technicien, RH) partage ces champs communs.
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const createRoleModel = (modelName, tableName) => {
  return sequelize.define(modelName, {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    matricule: {
      type: DataTypes.STRING(20),
      unique: true,
      allowNull: false,
      comment: 'Ex: VMAT0001',
    },
    nom: { type: DataTypes.STRING(100), allowNull: false },
    prenom: { type: DataTypes.STRING(100), allowNull: false },
    email: {
      type: DataTypes.STRING(150),
      unique: true,
      allowNull: false,
      validate: { isEmail: true },
    },
    motDePasse: { type: DataTypes.STRING, allowNull: false },
    telephone: { type: DataTypes.STRING(20) },
    photoUrl: { type: DataTypes.STRING(255) },
    dateNaissance: { type: DataTypes.DATEONLY },
    sexe: { type: DataTypes.ENUM('M', 'F') },
    adresse: { type: DataTypes.STRING(255) },
    numeroCNI: { type: DataTypes.STRING(30) },
    numeroCnps: { type: DataTypes.STRING(30) },
    situationMatrimoniale: { type: DataTypes.STRING(30) },
    nombreEnfants: { type: DataTypes.INTEGER, defaultValue: 0 },
    banque: { type: DataTypes.STRING(100) },
    compteBancaire: { type: DataTypes.STRING(50) },
    salaireBase: { type: DataTypes.DECIMAL(12, 2) },
    dateEmbauche: { type: DataTypes.DATEONLY },
    actif: { type: DataTypes.BOOLEAN, defaultValue: true },
    doitChangerMotDePasse: { type: DataTypes.BOOLEAN, defaultValue: true },
    permissions: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Permissions supplémentaires spécifiques',
    },
  }, {
    tableName: tableName || modelName.toLowerCase() + 's',
    timestamps: true,
  });
};

module.exports = createRoleModel;
