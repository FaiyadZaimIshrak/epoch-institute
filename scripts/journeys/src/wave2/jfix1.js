// The editor's first changes to the journeys of the second wave: node jfix.js jfix1.js
module.exports = {
 'first-fleet': [['and the article records that conflict began soon after,', 'and conflict began soon after,']],
 'long-walk': [['The article calls it a deportation and ethnic cleansing, carried out', 'It has been called a deportation and an ethnic cleansing, and it was carried out']],
 'humboldt': [
  ['in 1799 with authorization from the Spanish crown', 'in 1799 with authorisation from the Spanish crown'],
  ["armed with the King of Spain's authorization,", "armed with the King of Spain's authorisation,"],
 ],
 // stops whose place or order was the writer's inference, not the article's
 _drop: { 'rubruck': [[1, 'Talas'], [2, 'Sarai']], 'carpini': [[1, 'Wrocław']] },
 // the article's date here is of another event (the return to Britain)
 _undate: { 'mungo-park': [[1, 'Antigua']] },
};
