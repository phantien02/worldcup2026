const fs = require('fs');
const path = './src/data/matchMapping.json';
const mapping = require(path);

const newMappings = {
  "Đức vs Thứ 3 bảng A/B/C/D/F": "Trận 74",
  "Thứ 3 bảng A/B/C/D/F vs Đức": "Trận 74",
  "Nam Phi vs Canada": "Trận 73",
  "Canada vs Nam Phi": "Trận 73",
  "Nhất bảng F vs Marocco": "Trận 75",
  "Marocco vs Nhất bảng F": "Trận 75",
  "Mỹ vs Thứ 3 bảng B/E/F/I/J": "Trận 81",
  "Thứ 3 bảng B/E/F/I/J vs Mỹ": "Trận 81",
  "Brazil vs Nhì bảng F": "Trận 76",
  "Nhì bảng F vs Brazil": "Trận 76",
  "Mexico vs Thứ 3 bảng C/E/F/H/I": "Trận 79",
  "Thứ 3 bảng C/E/F/H/I vs Mexico": "Trận 79",
  "Argentina vs Nhì bảng H": "Trận 86",
  "Nhì bảng H vs Argentina": "Trận 86",
  "Thụy Sĩ vs Thứ 3 bảng E/F/G/I/J": "Trận 85",
  "Thứ 3 bảng E/F/G/I/J vs Thụy Sĩ": "Trận 85"
};

Object.assign(mapping, newMappings);
fs.writeFileSync(path, JSON.stringify(mapping, null, 2));
console.log("Patched matchMapping.json");
