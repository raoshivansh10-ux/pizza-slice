import axios from 'axios';

const testUrls = [
  { name: 'Margherita Classica', url: 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=600&q=80' },
  { name: 'Fiery Farmhouse Special', url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=80' },
  { name: 'Tandoori Paneer Supreme', url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80' },
  { name: 'Truffle Wild Mushroom', url: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=600&q=80' },
  { name: 'Quattro Formaggi', url: 'https://images.unsplash.com/photo-1573821663912-569905455b1c?auto=format&fit=crop&w=600&q=80' },
  { name: 'Smoky BBQ Paneer', url: 'https://images.unsplash.com/photo-1594007654729-407eedc4be65?auto=format&fit=crop&w=600&q=80' },
  { name: 'Artisan Garden Pesto Delight', url: 'https://images.unsplash.com/photo-1588315029754-2dd089d39a1a?auto=format&fit=crop&w=600&q=80' },
  { name: 'Mediterranean Olive', url: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?auto=format&fit=crop&w=600&q=80' },
  { name: 'Classic Garlic Breadsticks', url: 'https://images.unsplash.com/photo-1549611016-3a70d82b5040?auto=format&fit=crop&w=600&q=80' },
  { name: 'Stuffed Cheesy Garlic Bread', url: 'https://images.unsplash.com/photo-1619895092538-128341789043?auto=format&fit=crop&w=600&q=80' },
  { name: 'Spicy Jalapeno Garlic Toast', url: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=600&q=80' },
  { name: 'Crispy Peri-Peri Wedges', url: 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?auto=format&fit=crop&w=600&q=80' },
  { name: 'Loaded Cheesy Nachos', url: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?auto=format&fit=crop&w=600&q=80' },
  { name: 'Italian Mozzarella Dippers', url: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?auto=format&fit=crop&w=600&q=80' },
  { name: 'Classic Lemon Iced Tea', url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80' },
  { name: 'San Pellegrino Blood Orange', url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80' },
  { name: 'Craft Mango Mint Cooler', url: 'https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=600&q=80' },
  { name: 'Warm Chocolate Lava Cake', url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80' },
  { name: 'Classic Italian Tiramisu Cup', url: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=600&q=80' },
  { name: 'Baked Blueberry Cheesecake', url: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=600&q=80' },
  { name: 'Mega Family Feast', url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80' },
  { name: 'Couples Pizza & Bread Feast', url: 'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?auto=format&fit=crop&w=600&q=80' },
];

async function validateAll() {
  console.log('Testing image URLs reachability...');
  let failed = 0;
  for (const item of testUrls) {
    try {
      const res = await axios.head(item.url, { timeout: 5000 });
      console.log(`✅ [${res.status}] ${item.name} -> ${res.headers['content-type']}`);
    } catch (err) {
      console.error(`❌ FAILED: ${item.name} (${err.message})`);
      failed++;
    }
  }
  console.log(`\nFinished: ${testUrls.length - failed}/${testUrls.length} reachable.`);
}

validateAll();
