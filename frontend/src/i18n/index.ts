/**
 * @file index.ts
 * Configuration i18next pour VAN BTP ERP.
 * Les traductions sont désormais dans des fichiers JSON séparés (fr.json, en.json)
 * au lieu d'être toutes dans un seul fichier i18n.ts de 1111 lignes.
 *
 * Pour ajouter une langue : créer locales/xx.json et l'importer ici.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import fr from './locales/fr.json';
import en from './locales/en.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
    },
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
