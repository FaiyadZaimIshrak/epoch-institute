// epoch-stats.js — Empire Historical Analysis: stats data + SVG radar renderer
// The Epoch Institute

var STAT_DIMENSIONS = [
  { key: 'militaryPower',                shortLabel: 'Military'  },
  { key: 'territorialReach',             shortLabel: 'Territory' },
  { key: 'economicStrength',             shortLabel: 'Economy'   },
  { key: 'tradeNetworks',                shortLabel: 'Trade'     },
  { key: 'administrativeSophistication', shortLabel: 'Admin'     },
  { key: 'culturalIntellectualOutput',   shortLabel: 'Culture'   },
  { key: 'institutionalLongevity',       shortLabel: 'Longevity' },
  { key: 'historicalInfluence',          shortLabel: 'Influence' },
];

// 94 entries sorted by overall score descending; rank = position in list (1-indexed)
var EMPIRE_STATS_BY_NAME = {
  'Roman Empire': { rank:1, overall:9.2, tags:['Military','Administrative','Cultural','Expansionist'],
    stats:{ militaryPower:10, territorialReach:9, economicStrength:9, tradeNetworks:7, administrativeSophistication:10, culturalIntellectualOutput:10, institutionalLongevity:8, historicalInfluence:10 } },
  'British Empire': { rank:2, overall:9.2, tags:['Colonial','Maritime','Administrative','Commercial'],
    stats:{ militaryPower:9, territorialReach:10, economicStrength:10, tradeNetworks:10, administrativeSophistication:10, culturalIntellectualOutput:8, institutionalLongevity:6, historicalInfluence:10 } },
  'Ottoman Empire': { rank:3, overall:8.2, tags:['Military','Administrative','Expansionist','Trade'],
    stats:{ militaryPower:9, territorialReach:8, economicStrength:8, tradeNetworks:7, administrativeSophistication:9, culturalIntellectualOutput:7, institutionalLongevity:8, historicalInfluence:9 } },
  'Achaemenid Empire': { rank:4, overall:8.0, tags:['Military','Expansionist','Administrative','Trade'],
    stats:{ militaryPower:9, territorialReach:10, economicStrength:8, tradeNetworks:7, administrativeSophistication:9, culturalIntellectualOutput:6, institutionalLongevity:4, historicalInfluence:10 } },
  'Abbasid Caliphate': { rank:5, overall:8.0, tags:['Theocratic','Cultural','Trade','Administrative'],
    stats:{ militaryPower:6, territorialReach:6, economicStrength:8, tradeNetworks:9, administrativeSophistication:9, culturalIntellectualOutput:10, institutionalLongevity:5, historicalInfluence:10 } },
  'Mughal Empire': { rank:6, overall:7.8, tags:['Military','Administrative','Cultural','Agricultural'],
    stats:{ militaryPower:8, territorialReach:7, economicStrength:10, tradeNetworks:6, administrativeSophistication:7, culturalIntellectualOutput:10, institutionalLongevity:4, historicalInfluence:9 } },
  'Byzantine Empire': { rank:7, overall:7.7, tags:['Administrative','Cultural','Military','Trade'],
    stats:{ militaryPower:6, territorialReach:5, economicStrength:7, tradeNetworks:6, administrativeSophistication:10, culturalIntellectualOutput:9, institutionalLongevity:10, historicalInfluence:8 } },
  'Tang Dynasty': { rank:8, overall:7.7, tags:['Administrative','Cultural','Military','Trade'],
    stats:{ militaryPower:7, territorialReach:6, economicStrength:8, tradeNetworks:7, administrativeSophistication:9, culturalIntellectualOutput:10, institutionalLongevity:4, historicalInfluence:9 } },
  'French Empire': { rank:9, overall:7.5, tags:['Colonial','Maritime','Military','Cultural'],
    stats:{ militaryPower:8, territorialReach:7, economicStrength:8, tradeNetworks:6, administrativeSophistication:8, culturalIntellectualOutput:9, institutionalLongevity:4, historicalInfluence:9 } },
  'Han Dynasty': { rank:10, overall:7.5, tags:['Administrative','Military','Trade','Cultural'],
    stats:{ militaryPower:8, territorialReach:7, economicStrength:8, tradeNetworks:6, administrativeSophistication:9, culturalIntellectualOutput:8, institutionalLongevity:4, historicalInfluence:9 } },
  'Egyptian Empire New Kingdom': { rank:11, overall:7.3, tags:['Military','Theocratic','Cultural','Agricultural'],
    stats:{ militaryPower:8, territorialReach:6, economicStrength:7, tradeNetworks:5, administrativeSophistication:8, culturalIntellectualOutput:10, institutionalLongevity:4, historicalInfluence:9 } },
  'Spanish Empire': { rank:12, overall:6.9, tags:['Colonial','Maritime','Military','Expansionist'],
    stats:{ militaryPower:8, territorialReach:8, economicStrength:7, tradeNetworks:7, administrativeSophistication:7, culturalIntellectualOutput:6, institutionalLongevity:4, historicalInfluence:8 } },
  'Ming Empire': { rank:13, overall:6.9, tags:['Administrative','Military','Cultural','Agricultural'],
    stats:{ militaryPower:6, territorialReach:6, economicStrength:8, tradeNetworks:6, administrativeSophistication:9, culturalIntellectualOutput:8, institutionalLongevity:4, historicalInfluence:7 } },
  'Song Dynasty': { rank:14, overall:6.8, tags:['Administrative','Commercial','Cultural'],
    stats:{ militaryPower:3, territorialReach:3, economicStrength:9, tradeNetworks:8, administrativeSophistication:9, culturalIntellectualOutput:10, institutionalLongevity:3, historicalInfluence:8 } },
  'Qing Empire': { rank:15, overall:6.7, tags:['Administrative','Military','Agricultural','Expansionist'],
    stats:{ militaryPower:6, territorialReach:8, economicStrength:9, tradeNetworks:5, administrativeSophistication:8, culturalIntellectualOutput:6, institutionalLongevity:4, historicalInfluence:7 } },
  'Babylonian Empire': { rank:16, overall:6.6, tags:['Administrative','Cultural','Theocratic'],
    stats:{ militaryPower:5, territorialReach:5, economicStrength:7, tradeNetworks:5, administrativeSophistication:9, culturalIntellectualOutput:9, institutionalLongevity:2, historicalInfluence:9 } },
  'Assyrian Empire': { rank:17, overall:6.4, tags:['Military','Expansionist','Administrative'],
    stats:{ militaryPower:10, territorialReach:7, economicStrength:6, tradeNetworks:4, administrativeSophistication:7, culturalIntellectualOutput:5, institutionalLongevity:5, historicalInfluence:7 } },
  'Macedonian Empire': { rank:18, overall:6.4, tags:['Military','Expansionist','Cultural'],
    stats:{ militaryPower:10, territorialReach:9, economicStrength:5, tradeNetworks:4, administrativeSophistication:4, culturalIntellectualOutput:7, institutionalLongevity:1, historicalInfluence:10 } },
  'German Empire': { rank:19, overall:6.4, tags:['Military','Administrative','Expansionist','Commercial'],
    stats:{ militaryPower:9, territorialReach:5, economicStrength:9, tradeNetworks:6, administrativeSophistication:8, culturalIntellectualOutput:7, institutionalLongevity:2, historicalInfluence:5 } },
  'Umayyad Caliphate': { rank:20, overall:6.4, tags:['Military','Theocratic','Expansionist','Administrative'],
    stats:{ militaryPower:9, territorialReach:9, economicStrength:6, tradeNetworks:6, administrativeSophistication:6, culturalIntellectualOutput:5, institutionalLongevity:2, historicalInfluence:8 } },
  'Russian Empire': { rank:21, overall:6.2, tags:['Military','Expansionist','Administrative','Agricultural'],
    stats:{ militaryPower:8, territorialReach:9, economicStrength:6, tradeNetworks:4, administrativeSophistication:6, culturalIntellectualOutput:6, institutionalLongevity:3, historicalInfluence:7 } },
  'Mongol Empire': { rank:22, overall:6.2, tags:['Military','Nomadic','Expansionist','Trade'],
    stats:{ militaryPower:10, territorialReach:10, economicStrength:5, tradeNetworks:6, administrativeSophistication:3, culturalIntellectualOutput:3, institutionalLongevity:2, historicalInfluence:10 } },
  'Maurya Empire': { rank:23, overall:6.1, tags:['Military','Administrative','Expansionist','Theocratic'],
    stats:{ militaryPower:7, territorialReach:6, economicStrength:6, tradeNetworks:5, administrativeSophistication:8, culturalIntellectualOutput:6, institutionalLongevity:3, historicalInfluence:7 } },
  'Gupta Empire': { rank:24, overall:6.1, tags:['Cultural','Administrative','Agricultural'],
    stats:{ militaryPower:4, territorialReach:4, economicStrength:6, tradeNetworks:5, administrativeSophistication:7, culturalIntellectualOutput:10, institutionalLongevity:3, historicalInfluence:8 } },
  'Dutch Empire': { rank:25, overall:6.0, tags:['Commercial','Maritime','Trade'],
    stats:{ militaryPower:5, territorialReach:5, economicStrength:8, tradeNetworks:10, administrativeSophistication:6, culturalIntellectualOutput:5, institutionalLongevity:3, historicalInfluence:6 } },
  'Safavid Empire': { rank:26, overall:6.0, tags:['Theocratic','Military','Cultural','Administrative'],
    stats:{ militaryPower:6, territorialReach:5, economicStrength:6, tradeNetworks:5, administrativeSophistication:7, culturalIntellectualOutput:8, institutionalLongevity:4, historicalInfluence:6 } },
  'Sasanian Empire': { rank:27, overall:6.0, tags:['Military','Administrative','Cultural','Theocratic'],
    stats:{ militaryPower:7, territorialReach:5, economicStrength:6, tradeNetworks:5, administrativeSophistication:7, culturalIntellectualOutput:7, institutionalLongevity:4, historicalInfluence:6 } },
  'Ptolemaic Empire': { rank:28, overall:5.9, tags:['Administrative','Cultural','Trade','Maritime'],
    stats:{ militaryPower:5, territorialReach:4, economicStrength:7, tradeNetworks:6, administrativeSophistication:7, culturalIntellectualOutput:8, institutionalLongevity:3, historicalInfluence:6 } },
  'Portuguese Empire': { rank:29, overall:5.9, tags:['Maritime','Colonial','Commercial','Trade'],
    stats:{ militaryPower:5, territorialReach:6, economicStrength:6, tradeNetworks:9, administrativeSophistication:5, culturalIntellectualOutput:5, institutionalLongevity:4, historicalInfluence:7 } },
  'Chaldean Empire': { rank:30, overall:5.7, tags:['Military','Cultural','Theocratic'],
    stats:{ militaryPower:6, territorialReach:4, economicStrength:6, tradeNetworks:5, administrativeSophistication:6, culturalIntellectualOutput:8, institutionalLongevity:2, historicalInfluence:7 } },
  'Empire of Japan': { rank:31, overall:5.7, tags:['Military','Colonial','Expansionist','Commercial'],
    stats:{ militaryPower:8, territorialReach:5, economicStrength:7, tradeNetworks:5, administrativeSophistication:7, culturalIntellectualOutput:5, institutionalLongevity:2, historicalInfluence:6 } },
  'Akkadian Empire': { rank:32, overall:5.6, tags:['Military','Expansionist','Administrative'],
    stats:{ militaryPower:8, territorialReach:7, economicStrength:5, tradeNetworks:4, administrativeSophistication:6, culturalIntellectualOutput:5, institutionalLongevity:2, historicalInfluence:7 } },
  'Punic Empire': { rank:33, overall:5.6, tags:['Maritime','Commercial','Trade'],
    stats:{ militaryPower:6, territorialReach:5, economicStrength:7, tradeNetworks:9, administrativeSophistication:5, culturalIntellectualOutput:5, institutionalLongevity:3, historicalInfluence:5 } },
  'Seleucid Empire': { rank:34, overall:5.6, tags:['Military','Administrative','Trade','Cultural'],
    stats:{ militaryPower:6, territorialReach:6, economicStrength:6, tradeNetworks:6, administrativeSophistication:7, culturalIntellectualOutput:6, institutionalLongevity:3, historicalInfluence:5 } },
  'Mali Empire': { rank:35, overall:5.5, tags:['Trade','Theocratic','Agricultural','Cultural'],
    stats:{ militaryPower:5, territorialReach:6, economicStrength:6, tradeNetworks:7, administrativeSophistication:5, culturalIntellectualOutput:6, institutionalLongevity:3, historicalInfluence:6 } },
  'Fatimid Caliphate': { rank:36, overall:5.4, tags:['Theocratic','Trade','Cultural','Administrative'],
    stats:{ militaryPower:5, territorialReach:5, economicStrength:6, tradeNetworks:6, administrativeSophistication:6, culturalIntellectualOutput:7, institutionalLongevity:3, historicalInfluence:5 } },
  'Hittite Empire': { rank:37, overall:5.3, tags:['Military','Expansionist','Trade'],
    stats:{ militaryPower:7, territorialReach:5, economicStrength:5, tradeNetworks:5, administrativeSophistication:6, culturalIntellectualOutput:5, institutionalLongevity:3, historicalInfluence:6 } },
  'Holy Roman Empire': { rank:38, overall:5.3, tags:['Theocratic','Administrative','Cultural'],
    stats:{ militaryPower:4, territorialReach:5, economicStrength:5, tradeNetworks:4, administrativeSophistication:5, culturalIntellectualOutput:6, institutionalLongevity:7, historicalInfluence:6 } },
  'Austro-Hungarian Empire': { rank:39, overall:5.3, tags:['Administrative','Cultural','Military'],
    stats:{ militaryPower:5, territorialReach:5, economicStrength:6, tradeNetworks:5, administrativeSophistication:7, culturalIntellectualOutput:7, institutionalLongevity:3, historicalInfluence:4 } },
  'Mamluk Sultanate': { rank:40, overall:5.3, tags:['Military','Trade','Administrative'],
    stats:{ militaryPower:7, territorialReach:4, economicStrength:6, tradeNetworks:6, administrativeSophistication:6, culturalIntellectualOutput:5, institutionalLongevity:3, historicalInfluence:5 } },
  'Neo-Sumerian Empire': { rank:41, overall:5.2, tags:['Administrative','Agricultural','Theocratic'],
    stats:{ militaryPower:4, territorialReach:4, economicStrength:6, tradeNetworks:4, administrativeSophistication:8, culturalIntellectualOutput:6, institutionalLongevity:2, historicalInfluence:6 } },
  'Rashidun Caliphate': { rank:42, overall:5.2, tags:['Military','Theocratic','Expansionist'],
    stats:{ militaryPower:8, territorialReach:6, economicStrength:4, tradeNetworks:4, administrativeSophistication:5, culturalIntellectualOutput:4, institutionalLongevity:1, historicalInfluence:8 } },
  'Yuan Dynasty': { rank:43, overall:5.2, tags:['Military','Nomadic','Trade','Administrative'],
    stats:{ militaryPower:8, territorialReach:6, economicStrength:6, tradeNetworks:6, administrativeSophistication:5, culturalIntellectualOutput:4, institutionalLongevity:2, historicalInfluence:5 } },
  'Srivijaya Empire': { rank:44, overall:5.2, tags:['Maritime','Commercial','Trade','Theocratic'],
    stats:{ militaryPower:4, territorialReach:4, economicStrength:6, tradeNetworks:9, administrativeSophistication:4, culturalIntellectualOutput:6, institutionalLongevity:4, historicalInfluence:5 } },
  'Timurid Empire': { rank:45, overall:5.1, tags:['Military','Cultural','Expansionist'],
    stats:{ militaryPower:8, territorialReach:6, economicStrength:4, tradeNetworks:4, administrativeSophistication:4, culturalIntellectualOutput:8, institutionalLongevity:2, historicalInfluence:5 } },
  'Songhai Empire': { rank:46, overall:5.0, tags:['Military','Trade','Administrative','Expansionist'],
    stats:{ militaryPower:6, territorialReach:5, economicStrength:6, tradeNetworks:6, administrativeSophistication:5, culturalIntellectualOutput:5, institutionalLongevity:2, historicalInfluence:5 } },
  'Seljuk Empire': { rank:47, overall:5.0, tags:['Military','Expansionist','Theocratic'],
    stats:{ militaryPower:7, territorialReach:6, economicStrength:5, tradeNetworks:5, administrativeSophistication:5, culturalIntellectualOutput:4, institutionalLongevity:3, historicalInfluence:5 } },
  'Tokugawa Shogunate': { rank:48, overall:5.0, tags:['Administrative','Agricultural','Military'],
    stats:{ militaryPower:4, territorialReach:2, economicStrength:6, tradeNetworks:3, administrativeSophistication:8, culturalIntellectualOutput:7, institutionalLongevity:4, historicalInfluence:5 } },
  'Khmer Empire': { rank:49, overall:5.0, tags:['Theocratic','Agricultural','Cultural','Military'],
    stats:{ militaryPower:5, territorialReach:4, economicStrength:5, tradeNetworks:4, administrativeSophistication:5, culturalIntellectualOutput:8, institutionalLongevity:4, historicalInfluence:5 } },
  'Parthian Empire': { rank:50, overall:5.0, tags:['Military','Trade','Administrative'],
    stats:{ militaryPower:6, territorialReach:5, economicStrength:5, tradeNetworks:6, administrativeSophistication:5, culturalIntellectualOutput:4, institutionalLongevity:4, historicalInfluence:5 } },
  'Aztec Empire': { rank:51, overall:5.0, tags:['Military','Theocratic','Tributary','Cultural'],
    stats:{ militaryPower:6, territorialReach:3, economicStrength:6, tradeNetworks:5, administrativeSophistication:5, culturalIntellectualOutput:7, institutionalLongevity:2, historicalInfluence:5 } },
  'Ayyubid Empire': { rank:52, overall:4.8, tags:['Military','Theocratic','Trade'],
    stats:{ militaryPower:6, territorialReach:5, economicStrength:5, tradeNetworks:5, administrativeSophistication:5, culturalIntellectualOutput:5, institutionalLongevity:2, historicalInfluence:5 } },
  'Majapahit Empire': { rank:53, overall:4.8, tags:['Maritime','Trade','Military','Cultural'],
    stats:{ militaryPower:5, territorialReach:5, economicStrength:5, tradeNetworks:6, administrativeSophistication:5, culturalIntellectualOutput:6, institutionalLongevity:3, historicalInfluence:4 } },
  'Elamite Confederation': { rank:54, overall:4.7, tags:['Military','Tributary','Agricultural'],
    stats:{ militaryPower:5, territorialReach:5, economicStrength:5, tradeNetworks:4, administrativeSophistication:4, culturalIntellectualOutput:4, institutionalLongevity:7, historicalInfluence:4 } },
  'Carolingian Empire': { rank:55, overall:4.7, tags:['Military','Theocratic','Administrative'],
    stats:{ militaryPower:6, territorialReach:6, economicStrength:4, tradeNetworks:3, administrativeSophistication:5, culturalIntellectualOutput:5, institutionalLongevity:2, historicalInfluence:6 } },
  'Polish-Lithuanian Commonwealth': { rank:56, overall:4.6, tags:['Administrative','Military','Cultural'],
    stats:{ militaryPower:5, territorialReach:5, economicStrength:5, tradeNetworks:4, administrativeSophistication:6, culturalIntellectualOutput:5, institutionalLongevity:3, historicalInfluence:4 } },
  'Ilkhanate': { rank:57, overall:4.6, tags:['Military','Nomadic','Trade'],
    stats:{ militaryPower:7, territorialReach:6, economicStrength:5, tradeNetworks:5, administrativeSophistication:4, culturalIntellectualOutput:4, institutionalLongevity:2, historicalInfluence:4 } },
  'Almohad Caliphate': { rank:58, overall:4.5, tags:['Theocratic','Military','Expansionist'],
    stats:{ militaryPower:6, territorialReach:5, economicStrength:5, tradeNetworks:4, administrativeSophistication:5, culturalIntellectualOutput:5, institutionalLongevity:2, historicalInfluence:4 } },
  'Aksumite Empire': { rank:59, overall:4.5, tags:['Trade','Maritime','Theocratic'],
    stats:{ militaryPower:4, territorialReach:3, economicStrength:5, tradeNetworks:6, administrativeSophistication:4, culturalIntellectualOutput:5, institutionalLongevity:4, historicalInfluence:5 } },
  'Kanem-Bornu Empire': { rank:60, overall:4.5, tags:['Trade','Theocratic','Military','Tributary'],
    stats:{ militaryPower:4, territorialReach:4, economicStrength:4, tradeNetworks:5, administrativeSophistication:4, culturalIntellectualOutput:3, institutionalLongevity:9, historicalInfluence:4 } },
  'Benin Empire': { rank:61, overall:4.5, tags:['Cultural','Trade','Military'],
    stats:{ militaryPower:4, territorialReach:3, economicStrength:4, tradeNetworks:4, administrativeSophistication:4, culturalIntellectualOutput:8, institutionalLongevity:5, historicalInfluence:4 } },
  'Delhi Sultanate': { rank:62, overall:4.5, tags:['Military','Theocratic','Administrative'],
    stats:{ militaryPower:6, territorialReach:5, economicStrength:5, tradeNetworks:4, administrativeSophistication:5, culturalIntellectualOutput:4, institutionalLongevity:3, historicalInfluence:4 } },
  'Khwarazmian Empire': { rank:63, overall:4.5, tags:['Military','Trade','Administrative'],
    stats:{ militaryPower:6, territorialReach:5, economicStrength:5, tradeNetworks:6, administrativeSophistication:5, culturalIntellectualOutput:4, institutionalLongevity:2, historicalInfluence:3 } },
  'Kushite Empire': { rank:64, overall:4.4, tags:['Military','Theocratic','Trade'],
    stats:{ militaryPower:5, territorialReach:4, economicStrength:4, tradeNetworks:4, administrativeSophistication:4, culturalIntellectualOutput:5, institutionalLongevity:5, historicalInfluence:4 } },
  'Oyo Empire': { rank:65, overall:4.3, tags:['Military','Trade','Tributary'],
    stats:{ militaryPower:5, territorialReach:4, economicStrength:5, tradeNetworks:5, administrativeSophistication:5, culturalIntellectualOutput:4, institutionalLongevity:4, historicalInfluence:3 } },
  'Ghana Empire': { rank:66, overall:4.2, tags:['Trade','Agricultural','Tributary'],
    stats:{ militaryPower:4, territorialReach:4, economicStrength:5, tradeNetworks:6, administrativeSophistication:4, culturalIntellectualOutput:3, institutionalLongevity:4, historicalInfluence:4 } },
  'Ethiopian Empire': { rank:67, overall:4.2, tags:['Theocratic','Military','Agricultural'],
    stats:{ militaryPower:4, territorialReach:3, economicStrength:4, tradeNetworks:3, administrativeSophistication:4, culturalIntellectualOutput:5, institutionalLongevity:7, historicalInfluence:4 } },
  'Ashanti Empire': { rank:68, overall:4.2, tags:['Military','Trade','Cultural'],
    stats:{ militaryPower:5, territorialReach:3, economicStrength:5, tradeNetworks:5, administrativeSophistication:5, culturalIntellectualOutput:5, institutionalLongevity:3, historicalInfluence:3 } },
  'Khazar Khaganate': { rank:69, overall:4.2, tags:['Trade','Military','Nomadic'],
    stats:{ militaryPower:5, territorialReach:4, economicStrength:4, tradeNetworks:6, administrativeSophistication:4, culturalIntellectualOutput:3, institutionalLongevity:4, historicalInfluence:4 } },
  'Maratha Empire': { rank:70, overall:4.0, tags:['Military','Expansionist','Agricultural'],
    stats:{ militaryPower:6, territorialReach:5, economicStrength:4, tradeNetworks:3, administrativeSophistication:4, culturalIntellectualOutput:4, institutionalLongevity:2, historicalInfluence:4 } },
  'Almoravid Empire': { rank:71, overall:3.9, tags:['Theocratic','Military','Trade'],
    stats:{ militaryPower:6, territorialReach:4, economicStrength:4, tradeNetworks:5, administrativeSophistication:4, culturalIntellectualOutput:3, institutionalLongevity:2, historicalInfluence:3 } },
  'Kongo Empire': { rank:72, overall:3.9, tags:['Trade','Administrative','Agricultural'],
    stats:{ militaryPower:3, territorialReach:3, economicStrength:4, tradeNetworks:5, administrativeSophistication:5, culturalIntellectualOutput:4, institutionalLongevity:4, historicalInfluence:3 } },
  'Swedish Empire': { rank:73, overall:3.9, tags:['Military','Expansionist','Administrative'],
    stats:{ militaryPower:6, territorialReach:4, economicStrength:4, tradeNetworks:4, administrativeSophistication:5, culturalIntellectualOutput:3, institutionalLongevity:2, historicalInfluence:3 } },
  'Gokturk Empire': { rank:74, overall:3.9, tags:['Military','Nomadic','Trade'],
    stats:{ militaryPower:6, territorialReach:6, economicStrength:3, tradeNetworks:5, administrativeSophistication:3, culturalIntellectualOutput:2, institutionalLongevity:3, historicalInfluence:4 } },
  'Mitanni Empire': { rank:75, overall:3.7, tags:['Military','Expansionist','Agricultural'],
    stats:{ militaryPower:6, territorialReach:4, economicStrength:4, tradeNetworks:4, administrativeSophistication:4, culturalIntellectualOutput:3, institutionalLongevity:2, historicalInfluence:3 } },
  'Sokoto Caliphate': { rank:76, overall:3.6, tags:['Theocratic','Military','Administrative'],
    stats:{ militaryPower:5, territorialReach:4, economicStrength:3, tradeNetworks:3, administrativeSophistication:5, culturalIntellectualOutput:4, institutionalLongevity:2, historicalInfluence:3 } },
  'Xiongnu Empire': { rank:77, overall:3.6, tags:['Military','Nomadic','Expansionist'],
    stats:{ militaryPower:7, territorialReach:6, economicStrength:2, tradeNetworks:2, administrativeSophistication:2, culturalIntellectualOutput:2, institutionalLongevity:3, historicalInfluence:5 } },
  'Sikh Empire': { rank:78, overall:3.6, tags:['Military','Theocratic','Administrative'],
    stats:{ militaryPower:5, territorialReach:3, economicStrength:4, tradeNetworks:3, administrativeSophistication:5, culturalIntellectualOutput:4, institutionalLongevity:1, historicalInfluence:3 } },
  'Italian Empire': { rank:79, overall:3.5, tags:['Military','Colonial','Expansionist'],
    stats:{ militaryPower:5, territorialReach:4, economicStrength:5, tradeNetworks:3, administrativeSophistication:4, culturalIntellectualOutput:4, institutionalLongevity:1, historicalInfluence:2 } },
  'Brazilian Empire': { rank:80, overall:3.3, tags:['Agricultural','Trade','Administrative'],
    stats:{ militaryPower:3, territorialReach:4, economicStrength:5, tradeNetworks:4, administrativeSophistication:4, culturalIntellectualOutput:3, institutionalLongevity:2, historicalInfluence:2 } },
  'Chagatai Empire': { rank:81, overall:3.3, tags:['Military','Nomadic','Trade'],
    stats:{ militaryPower:5, territorialReach:5, economicStrength:3, tradeNetworks:4, administrativeSophistication:3, culturalIntellectualOutput:2, institutionalLongevity:3, historicalInfluence:2 } },
  'Median Empire': { rank:82, overall:3.2, tags:['Military','Expansionist','Nomadic'],
    stats:{ militaryPower:6, territorialReach:5, economicStrength:3, tradeNetworks:2, administrativeSophistication:3, culturalIntellectualOutput:2, institutionalLongevity:2, historicalInfluence:3 } },
  'Garamantian Empire': { rank:83, overall:3.2, tags:['Trade','Agricultural','Expansionist'],
    stats:{ militaryPower:3, territorialReach:3, economicStrength:3, tradeNetworks:5, administrativeSophistication:3, culturalIntellectualOutput:2, institutionalLongevity:5, historicalInfluence:2 } },
  'Mutapa Empire': { rank:84, overall:3.2, tags:['Trade','Theocratic','Agricultural'],
    stats:{ militaryPower:3, territorialReach:3, economicStrength:4, tradeNetworks:5, administrativeSophistication:3, culturalIntellectualOutput:3, institutionalLongevity:3, historicalInfluence:2 } },
  'Lunda Empire': { rank:85, overall:3.1, tags:['Trade','Administrative','Tributary'],
    stats:{ militaryPower:3, territorialReach:4, economicStrength:3, tradeNetworks:4, administrativeSophistication:4, culturalIntellectualOutput:2, institutionalLongevity:3, historicalInfluence:2 } },
  'Luba Empire': { rank:86, overall:3.0, tags:['Theocratic','Agricultural','Tributary'],
    stats:{ militaryPower:3, territorialReach:3, economicStrength:3, tradeNetworks:2, administrativeSophistication:4, culturalIntellectualOutput:4, institutionalLongevity:3, historicalInfluence:2 } },
  'Darfur Sultanate': { rank:87, overall:3.0, tags:['Theocratic','Trade','Military'],
    stats:{ militaryPower:4, territorialReach:3, economicStrength:3, tradeNetworks:4, administrativeSophistication:3, culturalIntellectualOutput:2, institutionalLongevity:3, historicalInfluence:2 } },
  'Wadai Empire': { rank:88, overall:3.0, tags:['Trade','Theocratic','Military'],
    stats:{ militaryPower:4, territorialReach:3, economicStrength:3, tradeNetworks:4, administrativeSophistication:3, culturalIntellectualOutput:2, institutionalLongevity:3, historicalInfluence:2 } },
  'Afsharid Empire': { rank:89, overall:3.0, tags:['Military','Expansionist'],
    stats:{ militaryPower:7, territorialReach:4, economicStrength:3, tradeNetworks:3, administrativeSophistication:2, culturalIntellectualOutput:2, institutionalLongevity:1, historicalInfluence:2 } },
  'Zand Empire': { rank:90, overall:3.0, tags:['Military','Trade','Cultural'],
    stats:{ militaryPower:4, territorialReach:2, economicStrength:4, tradeNetworks:4, administrativeSophistication:3, culturalIntellectualOutput:4, institutionalLongevity:1, historicalInfluence:2 } },
  'Kaabu Empire': { rank:91, overall:2.8, tags:['Military','Trade','Agricultural'],
    stats:{ militaryPower:4, territorialReach:3, economicStrength:3, tradeNetworks:4, administrativeSophistication:3, culturalIntellectualOutput:2, institutionalLongevity:2, historicalInfluence:2 } },
  'Jolof Empire': { rank:92, overall:2.6, tags:['Trade','Agricultural','Tributary'],
    stats:{ militaryPower:3, territorialReach:2, economicStrength:3, tradeNetworks:4, administrativeSophistication:3, culturalIntellectualOutput:2, institutionalLongevity:2, historicalInfluence:2 } },
  'Rozvi Empire': { rank:93, overall:2.6, tags:['Military','Agricultural','Theocratic'],
    stats:{ militaryPower:3, territorialReach:2, economicStrength:3, tradeNetworks:3, administrativeSophistication:3, culturalIntellectualOutput:3, institutionalLongevity:2, historicalInfluence:2 } },
  'Adal Sultanate': { rank:94, overall:2.6, tags:['Military','Theocratic','Expansionist'],
    stats:{ militaryPower:5, territorialReach:3, economicStrength:2, tradeNetworks:3, administrativeSophistication:2, culturalIntellectualOutput:2, institutionalLongevity:2, historicalInfluence:2 } },
};

// ── Renderer ─────────────────────────────────────────────────────────────────
(function() {
  var CX = 250, CY = 220, R = 150, LR = 180;

  // Convert polar angle (0° = top, clockwise) to SVG x,y
  function polar(angleDeg, r) {
    var rad = (angleDeg - 90) * Math.PI / 180;
    return [+(CX + r * Math.cos(rad)).toFixed(2), +(CY + r * Math.sin(rad)).toFixed(2)];
  }

  // text-anchor per axis index (8 axes, 45° apart, index 0 = top)
  var ANCHORS = ['middle','start','start','start','middle','end','end','end'];

  function buildSVG(stats) {
    var i, j, pts, p, out = '';

    // Concentric ring polygons (scores 2,4,6,8,10)
    var ringScores = [2,4,6,8,10];
    for (i = 0; i < ringScores.length; i++) {
      pts = [];
      for (j = 0; j < 8; j++) { p = polar(j * 45, R * ringScores[i] / 10); pts.push(p[0]+','+p[1]); }
      out += '<polygon points="'+pts.join(' ')+'" fill="none" stroke="rgba(201,168,76,0.15)" stroke-width="0.5"/>';
    }

    // Axis spokes
    for (j = 0; j < 8; j++) {
      p = polar(j * 45, R);
      out += '<line x1="'+CX+'" y1="'+CY+'" x2="'+p[0]+'" y2="'+p[1]+'" stroke="rgba(201,168,76,0.15)" stroke-width="0.5"/>';
    }

    // Data polygon + vertex dots
    var dataPts = [], dots = '';
    for (j = 0; j < 8; j++) {
      var val = stats[STAT_DIMENSIONS[j].key];
      p = polar(j * 45, R * val / 10);
      dataPts.push(p[0]+','+p[1]);
      dots += '<circle cx="'+p[0]+'" cy="'+p[1]+'" r="3" fill="#c9a84c"/>';
    }
    out += '<polygon points="'+dataPts.join(' ')+'" fill="rgba(201,168,76,0.12)" stroke="#c9a84c" stroke-width="1.5" stroke-linejoin="round"/>';
    out += dots;

    // Axis labels
    for (j = 0; j < 8; j++) {
      p = polar(j * 45, LR);
      out += '<text x="'+p[0]+'" y="'+p[1]+'" text-anchor="'+ANCHORS[j]+'" dominant-baseline="middle"'+
        ' font-family="Cinzel,serif" font-size="9.5" fill="var(--text)" opacity="0.6" letter-spacing="0.06em">'+
        STAT_DIMENSIONS[j].shortLabel+'</text>';
    }

    return '<svg viewBox="0 0 500 440" xmlns="http://www.w3.org/2000/svg" '+
      'role="img" aria-label="Empire statistics radar chart" style="overflow:visible">'+
      out+'</svg>';
  }

  function buildDimGrid(stats) {
    return '<div class="empire-dim-grid">'+
      STAT_DIMENSIONS.map(function(dim) {
        var val = stats[dim.key];
        return '<div class="empire-dim">'+
          '<span class="empire-dim-label">'+dim.shortLabel+'</span>'+
          '<div class="empire-dim-row">'+
            '<div class="empire-dim-bar-wrap"><div class="empire-dim-bar" style="width:'+(val*10)+'%"></div></div>'+
            '<span class="empire-dim-val">'+val+'</span>'+
          '</div>'+
        '</div>';
      }).join('')+
    '</div>';
  }

  function render(panel, profile) {
    var tags = profile.tags.map(function(t) {
      return '<span class="empire-tag">'+t+'</span>';
    }).join('');

    panel.innerHTML =
      '<div class="empire-stats-panel">'+
        '<p class="empire-stats-title">Historical Analysis</p>'+
        '<div class="empire-stats-top">'+
          '<div class="empire-overall-wrap">'+
            '<span class="empire-overall-score">'+profile.overall.toFixed(1)+'</span>'+
            '<span class="empire-overall-label">/ 10 &nbsp; Overall Score</span>'+
            '<span class="empire-rank-label">#'+profile.rank+' of 94 Empires</span>'+
          '</div>'+
          '<div class="empire-tags">'+tags+'</div>'+
        '</div>'+
        '<div class="empire-radar-wrap">'+buildSVG(profile.stats)+'</div>'+
        buildDimGrid(profile.stats)+
      '</div>';
  }

  document.addEventListener('DOMContentLoaded', function() {
    var panel = document.getElementById('empire-stats-panel');
    if (!panel) return;
    var profile = EMPIRE_STATS_BY_NAME[panel.dataset.empire];
    if (!profile) return;
    render(panel, profile);
  });

  window.epochStatsCompareHTML = function(name) {
    var profile = EMPIRE_STATS_BY_NAME[name];
    if (!profile) return '';
    var tags = profile.tags.map(function(t) {
      return '<span class="empire-tag">'+t+'</span>';
    }).join('');
    return '<div class="empire-stats-top compare-stats-top">'+
        '<div class="empire-overall-wrap">'+
          '<span class="empire-overall-score">'+profile.overall.toFixed(1)+'</span>'+
          '<span class="empire-overall-label">/ 10 &nbsp; Overall Score</span>'+
          '<span class="empire-rank-label">#'+profile.rank+' of 94 Empires</span>'+
        '</div>'+
        '<div class="empire-tags">'+tags+'</div>'+
      '</div>'+
      '<div class="empire-radar-wrap compare-radar-wrap">'+buildSVG(profile.stats)+'</div>'+
      buildDimGrid(profile.stats);
  };
})();
