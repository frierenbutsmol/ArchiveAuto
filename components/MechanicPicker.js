import React from 'react';
import ShopPicker from './ShopPicker';

// "Repair Shop / Mechanic Name" field for the Add Repair form.
//
// This is the same dropdown as the one on Add Maintenance (see ShopPicker.js), so both forms
// show the same personal list from GET /service-providers:
//   - shops the user typed into their own earlier records.
// "Other shop (type the name)" is always there for a new one.
//
// There is no "No shop" row here: doing the repair yourself is the DIY repair type on the form,
// and this field is not shown for DIY.
//
//   <MechanicPicker value={shopName} onChange={setShopName} />
export default function MechanicPicker({ value, onChange }) {
  return (
    <ShopPicker
      value={value}
      onChange={onChange}
      allowNone={false}
      title="Repair shop / mechanic"
      placeholder="Select a shop or mechanic"
    />
  );
}