import os
from PIL import Image, ImageFilter, ImageDraw

brain_dir = r"C:\Users\yadhu\.gemini\antigravity-ide\brain\e8236b91-30ee-41e1-bd28-8b126df7a865"
out_dir = r"c:\Users\yadhu\pizza delivery\frontend\public\images\toppings"
os.makedirs(out_dir, exist_ok=True)
pizzas_out = r"c:\Users\yadhu\pizza delivery\frontend\public\images"

# 1. Process Pizza Base: Circular crop with smooth edge
base_img_path = os.path.join(brain_dir, "pizza_plain_cheese_base_1787940155871.jpg")
if os.path.exists(base_img_path):
    base_img = Image.open(base_img_path).convert("RGBA")
    w, h = base_img.size
    
    mask = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(mask)
    pad = int(w * 0.035)
    draw.ellipse((pad, pad, w - pad, h - pad), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(4))
    
    base_img.putalpha(mask)
    base_img.save(os.path.join(pizzas_out, "pizza-base.png"), "PNG")
    print("Created pizza-base.png")

# 2. Extract pieces using simple grid sampling with alpha transparency
def process_topping_sheet(img_name, topping_name, crop_boxes):
    img_path = os.path.join(brain_dir, img_name)
    if not os.path.exists(img_path):
        print(f"Not found: {img_path}")
        return
    
    src = Image.open(img_path).convert("RGBA")
    w, h = src.size
    
    for idx, box in enumerate(crop_boxes):
        # box in percentage (x0, y0, x1, y1)
        x0, y0, x1, y1 = int(box[0]*w), int(box[1]*h), int(box[2]*w), int(box[3]*h)
        crop = src.crop((x0, y0, x1, y1))
        
        # Turn black background into transparent
        datas = crop.getdata()
        new_data = []
        for item in datas:
            # item is (r, g, b, a)
            # luminance
            lum = max(item[0], item[1], item[2])
            if lum < 35:
                # transparent
                alpha = int(max(0, (lum - 15) / 20 * 255))
                new_data.append((item[0], item[1], item[2], alpha))
            else:
                new_data.append(item)
                
        crop.putdata(new_data)
        bbox = crop.getbbox()
        if bbox:
            crop = crop.crop(bbox)
            
        save_path = os.path.join(out_dir, f"{topping_name}_{idx+1}.png")
        crop.save(save_path, "PNG")
        print(f"Saved {save_path}")

# Distinct crop boxes for each image to extract varied individual pieces
process_topping_sheet("topping_mushrooms_1787940175809.jpg", "mushroom", [
    (0.12, 0.10, 0.28, 0.26),
    (0.35, 0.06, 0.52, 0.22),
    (0.58, 0.10, 0.74, 0.26),
    (0.28, 0.40, 0.45, 0.58),
])

process_topping_sheet("topping_olives_1787940196349.jpg", "olive", [
    (0.18, 0.16, 0.32, 0.30),
    (0.38, 0.05, 0.52, 0.18),
    (0.56, 0.18, 0.70, 0.32),
    (0.32, 0.32, 0.46, 0.45),
])

process_topping_sheet("topping_onions_1787940213820.jpg", "onion", [
    (0.10, 0.08, 0.40, 0.30),
    (0.52, 0.06, 0.85, 0.32),
    (0.30, 0.32, 0.65, 0.60),
    (0.35, 0.76, 0.68, 0.98),
])

process_topping_sheet("topping_peppers_1787940234074.jpg", "pepper", [
    (0.06, 0.24, 0.22, 0.60),
    (0.38, 0.03, 0.66, 0.20),
    (0.65, 0.08, 0.88, 0.45),
    (0.40, 0.35, 0.75, 0.55),
])

process_topping_sheet("topping_corn_1787940254247.jpg", "corn", [
    (0.20, 0.18, 0.36, 0.34),
    (0.48, 0.15, 0.64, 0.30),
    (0.68, 0.32, 0.84, 0.48),
    (0.35, 0.45, 0.52, 0.60),
])

# Create realistic transparent assets for jalapeno, paneer, tomato, spinach
def create_jalapeno_asset(path, color_var=0):
    img = Image.new("RGBA", (140, 140), (0,0,0,0))
    d = ImageDraw.Draw(img)
    # Dark ribbed green skin
    d.ellipse((10, 10, 130, 130), fill=(36, 68, 30, 255), outline=(22, 45, 18, 255), width=6)
    # Pale green inner flesh
    d.ellipse((26, 26, 114, 114), fill=(65, 115, 52, 255))
    # Core hole
    d.ellipse((46, 46, 94, 94), fill=(28, 55, 24, 255))
    # Seeds
    for (sx, sy) in [(55, 55), (82, 58), (62, 85), (80, 80), (50, 70)]:
        d.ellipse((sx-5, sy-5, sx+5, sy+5), fill=(235, 220, 175, 255), outline=(180, 160, 110, 255), width=1)
    img = img.filter(ImageFilter.GaussianBlur(0.6))
    img.save(path, "PNG")
    print(f"Created {path}")

def create_paneer_asset(path, angle=0):
    img = Image.new("RGBA", (120, 120), (0,0,0,0))
    d = ImageDraw.Draw(img)
    # Roasted golden-spiced paneer cube
    d.rounded_rectangle((15, 15, 105, 105), radius=10, fill=(245, 230, 195, 255), outline=(180, 95, 40, 255), width=3)
    # Tandoori spice / grilled char marks
    d.line((25, 40, 95, 45), fill=(160, 45, 25, 230), width=5)
    d.line((20, 75, 100, 70), fill=(140, 40, 20, 230), width=5)
    d.ellipse((45, 50, 65, 62), fill=(195, 120, 45, 240))
    img = img.filter(ImageFilter.GaussianBlur(0.6))
    img.save(path, "PNG")
    print(f"Created {path}")

def create_tomato_asset(path):
    img = Image.new("RGBA", (140, 140), (0,0,0,0))
    d = ImageDraw.Draw(img)
    # Deep red ripe tomato slice
    d.ellipse((10, 10, 130, 130), fill=(195, 38, 25, 255), outline=(145, 22, 12, 255), width=5)
    # Jelly chambers
    for (cx, cy) in [(45, 45), (95, 45), (45, 95), (95, 95)]:
        d.ellipse((cx-15, cy-15, cx+15, cy+15), fill=(155, 25, 18, 255))
        d.ellipse((cx-5, cy-5, cx+5, cy+5), fill=(235, 210, 140, 255))
    img = img.filter(ImageFilter.GaussianBlur(0.6))
    img.save(path, "PNG")
    print(f"Created {path}")

def create_spinach_asset(path):
    img = Image.new("RGBA", (150, 110), (0,0,0,0))
    d = ImageDraw.Draw(img)
    # Organic leaf shape
    points = [(15, 55), (45, 18), (105, 15), (140, 55), (105, 95), (45, 90)]
    d.polygon(points, fill=(38, 72, 34, 255), outline=(22, 48, 20, 255))
    # Veins
    d.line((15, 55, 135, 55), fill=(75, 125, 65, 230), width=2)
    d.line((55, 55, 85, 30), fill=(65, 115, 55, 200), width=1)
    d.line((85, 55, 115, 35), fill=(65, 115, 55, 200), width=1)
    d.line((55, 55, 85, 80), fill=(65, 115, 55, 200), width=1)
    img = img.filter(ImageFilter.GaussianBlur(0.6))
    img.save(path, "PNG")
    print(f"Created {path}")

create_jalapeno_asset(os.path.join(out_dir, "jalapeno_1.png"))
create_jalapeno_asset(os.path.join(out_dir, "jalapeno_2.png"), 1)
create_paneer_asset(os.path.join(out_dir, "paneer_1.png"))
create_paneer_asset(os.path.join(out_dir, "paneer_2.png"), 1)
create_tomato_asset(os.path.join(out_dir, "tomato_1.png"))
create_tomato_asset(os.path.join(out_dir, "tomato_2.png"))
create_spinach_asset(os.path.join(out_dir, "spinach_1.png"))
create_spinach_asset(os.path.join(out_dir, "spinach_2.png"))

print("All topping assets ready!")
