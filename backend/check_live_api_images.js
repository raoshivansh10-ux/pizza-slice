import axios from 'axios';

async function checkLiveImages() {
  const res = await axios.get('http://localhost:5000/api/menu');
  const items = res.data.menuItems;

  console.log(`Total live menu items fetched: ${items.length}`);
  const categories = ['pizza', 'garlic-bread', 'sides', 'drinks', 'desserts'];

  for (const cat of categories) {
    const matching = items.filter((i) => i.category === cat);
    console.log(`\n=== Category: ${cat.toUpperCase()} (${matching.length} items) ===`);
    matching.forEach((m) => {
      console.log(`- ${m.name} -> ${m.image}`);
    });
  }
}

checkLiveImages().catch((err) => console.error(err.message));
