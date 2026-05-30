import os
import json
import time
import random
import threading
from flask import Flask, jsonify, request, render_template

# Firebase Admin SDK imports
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore

app = Flask(__name__)

DB_FILE = os.path.join(os.path.dirname(__file__), "db.json")

# --- DEFAULT STATE SEED DATA ---
DEFAULT_VENDORS = [
    {
        "id": 1,
        "name": "Amrit Dairy",
        "owner": "Suresh Kumar",
        "phone": "+91 9876543210",
        "address": "Action Area I, New Town",
        "latitude": 22.5785,
        "longitude": 88.4650,
        "categories": ["Dairy"],
        "distance": "0.8 km",
        "rating": 4.7,
        "open": True,
        "delivery": True,
        "delivery_radius": 2000
    },
    {
        "id": 2,
        "name": "GreenLeaf Veggies",
        "owner": "Ramesh K",
        "phone": "+91 9830098300",
        "address": "D254/401, Shapoorji Palonji, Action Area III",
        "latitude": 22.5811,
        "longitude": 88.4760,
        "categories": ["Vegetables", "Fruits"],
        "distance": "1.2 km",
        "rating": 4.5,
        "open": True,
        "delivery": True,
        "delivery_radius": 2500
    },
    {
        "id": 3,
        "name": "Daily Needs Store",
        "owner": "Alok Shaw",
        "phone": "+91 9007012345",
        "address": "Action Area II, New Town",
        "latitude": 22.5920,
        "longitude": 88.4810,
        "categories": ["Groceries", "Dairy"],
        "distance": "1.6 km",
        "rating": 4.4,
        "open": True,
        "delivery": True,
        "delivery_radius": 1500
    },
    {
        "id": 4,
        "name": "FreshFruit Hub",
        "owner": "Vikram Singh",
        "phone": "+91 9123456789",
        "address": "New Town Heights, Action Area III",
        "latitude": 22.5732,
        "longitude": 88.4900,
        "categories": ["Fruits"],
        "distance": "2.1 km",
        "rating": 4.6,
        "open": True,
        "delivery": True,
        "delivery_radius": 3000
    },
    {
        "id": 5,
        "name": "MediPlus Pharmacy",
        "owner": "Dr. A. Sen",
        "phone": "+91 9831112233",
        "address": "Rajarhat Main Road",
        "latitude": 22.6105,
        "longitude": 88.4688,
        "categories": ["Pharmacy"],
        "distance": "2.4 km",
        "rating": 4.8,
        "open": False,
        "delivery": True,
        "delivery_radius": 4000
    },
    {
        "id": 6,
        "name": "Scoops & Co",
        "owner": "Neha Das",
        "phone": "+91 8017001122",
        "address": "Axis Mall, New Town",
        "latitude": 22.5844,
        "longitude": 88.4590,
        "categories": ["Ice Cream"],
        "distance": "2.7 km",
        "rating": 4.3,
        "open": True,
        "delivery": True,
        "delivery_radius": 2000
    },
    {
        "id": 7,
        "name": "Patharghata Grocers",
        "owner": "B. Mondal",
        "phone": "+91 7003344556",
        "address": "Patharghata Crossing",
        "latitude": 22.5899,
        "longitude": 88.4988,
        "categories": ["Groceries"],
        "distance": "2.9 km",
        "rating": 4.2,
        "open": True,
        "delivery": False,
        "delivery_radius": 0
    },
    {
        "id": 8,
        "name": "GreenMart Grocery",
        "owner": "Amit Shaw",
        "phone": "+91 9876500099",
        "address": "Eco Space Blvd, Action Area II",
        "latitude": 22.5866,
        "longitude": 88.4722,
        "categories": ["Groceries"],
        "distance": "2.3 km",
        "rating": 4.4,
        "open": True,
        "delivery": True,
        "delivery_radius": 3000
    }
]

DEFAULT_ITEMS = [
    {"id": 1, "name": "Green capsicum", "vendor_id": 2, "vendor_name": "GreenLeaf Veggies", "category": "Vegetables", "price": 40, "unit": "per kg", "status": "In stock"},
    {"id": 2, "name": "Green grapes", "vendor_id": 4, "vendor_name": "FreshFruit Hub", "category": "Fruits", "price": 90, "unit": "per kg", "status": "In stock"},
    {"id": 3, "name": "Green tea 250g", "vendor_id": 8, "vendor_name": "GreenMart Grocery", "category": "Groceries", "price": 180, "unit": "per pack", "status": "Low stock"},
    {"id": 4, "name": "Amrit Butter 500g", "vendor_id": 1, "vendor_name": "Amrit Dairy", "category": "Dairy", "price": 250, "unit": "per pack", "status": "In stock"},
    {"id": 5, "name": "Organic Spinach", "vendor_id": 2, "vendor_name": "GreenLeaf Veggies", "category": "Vegetables", "price": 30, "unit": "per bundle", "status": "In stock"},
    {"id": 6, "name": "Vanilla Ice Cream 1L", "vendor_id": 6, "vendor_name": "Scoops & Co", "category": "Ice Cream", "price": 220, "unit": "per tub", "status": "In stock"},
    {"id": 7, "name": "Paracetamol 650mg", "vendor_id": 5, "vendor_name": "MediPlus Pharmacy", "category": "Pharmacy", "price": 15, "unit": "per strip", "status": "In stock"}
]

DEFAULT_ORDERS = [
    {
        "id": 4821,
        "vendor_id": 1,
        "vendor_name": "Amrit Dairy",
        "customer_name": "Saurabh P",
        "customer_code": "SP",
        "amount": 240,
        "items_count": 3,
        "type": "Delivery",
        "status": "Completed",
        "time": "5 mins ago",
        "day": "Sun"
    },
    {
        "id": 4820,
        "vendor_id": 2,
        "vendor_name": "GreenLeaf Veggies",
        "customer_name": "Arjun M",
        "customer_code": "AA",
        "amount": 118,
        "items_count": 5,
        "type": "Pickup",
        "status": "Accepted",
        "time": "12 mins ago",
        "day": "Sun"
    },
    {
        "id": 4819,
        "vendor_id": 3,
        "vendor_name": "Daily Needs Store",
        "customer_name": "Nitesh T",
        "customer_code": "NT",
        "amount": 560,
        "items_count": 12,
        "type": "Delivery",
        "status": "Completed",
        "time": "45 mins ago",
        "day": "Sat"
    },
    {
        "id": 4818,
        "vendor_id": 4,
        "vendor_name": "FreshFruit Hub",
        "customer_name": "Chirag P",
        "customer_code": "CP",
        "amount": 190,
        "items_count": 4,
        "type": "Delivery",
        "status": "Pending",
        "time": "2 hours ago",
        "day": "Sat"
    }
]

DEFAULT_SETTINGS = {
    "discovery_radius": 3.0,
    "default_delivery_fee": 25,
    "order_model": "Pickup + Delivery"
}


# --- DATA PERSISTENCE MANAGER (FIRESTORE WITH GRACEFUL JSON FALLBACK) ---
class DatabaseManager:
    def __init__(self):
        self.use_firestore = False
        self.db = None
        self.local_file = DB_FILE
        self.initialize_connection()

    def initialize_connection(self):
        # Look for credentials file 'service-account.json'
        service_account_path = os.path.join(os.path.dirname(__file__), "service-account.json")
        
        try:
            if os.path.exists(service_account_path):
                print(f"[Database] Found service-account.json. Initializing Firebase Admin...")
                cred = credentials.Certificate(service_account_path)
                firebase_admin.initialize_app(cred)
                self.db = firestore.client()
                self.use_firestore = True
                print("[Database] Connected successfully to Google Cloud Firestore!")
            else:
                # Try application default credentials
                print("[Database] service-account.json not found. Checking for Default Application credentials...")
                try:
                    firebase_admin.initialize_app()
                    self.db = firestore.client()
                    self.use_firestore = True
                    print("[Database] Connected to Cloud Firestore via default credentials.")
                except Exception:
                    print("[Database] No credentials found. Falling back to local db.json storage.")
                    self.use_firestore = False
        except Exception as e:
            print(f"[Database] Firestore initialization failed: {e}. Falling back to db.json.")
            self.use_firestore = False

        if not self.use_firestore:
            # Seed local db file if missing
            if not os.path.exists(self.local_file):
                self.save_local_db({
                    "vendors": DEFAULT_VENDORS,
                    "items": DEFAULT_ITEMS,
                    "orders": DEFAULT_ORDERS,
                    "settings": DEFAULT_SETTINGS,
                    "weekly_totals": {
                        "Mon": 87, "Tue": 112, "Wed": 98, "Thu": 124, "Fri": 119, "Sat": 150, "Sun": 140
                    }
                })
        else:
            self.seed_firestore_if_empty()

    def seed_firestore_if_empty(self):
        try:
            # Check if vendors is empty
            vendors_ref = self.db.collection("vendors")
            docs = list(vendors_ref.limit(1).stream())
            if not docs:
                print("[Database] Firestore collection is empty. Seeding defaults...")
                # Seed Vendors
                for v in DEFAULT_VENDORS:
                    vendors_ref.document(str(v["id"])).set(v)
                # Seed Items
                items_ref = self.db.collection("items")
                for item in DEFAULT_ITEMS:
                    items_ref.document(str(item["id"])).set(item)
                # Seed Orders
                orders_ref = self.db.collection("orders")
                for o in DEFAULT_ORDERS:
                    orders_ref.document(str(o["id"])).set(o)
                # Seed Settings & Charts
                self.db.collection("config").document("settings").set(DEFAULT_SETTINGS)
                self.db.collection("config").document("weekly_totals").set({
                    "Mon": 87, "Tue": 112, "Wed": 98, "Thu": 124, "Fri": 119, "Sat": 150, "Sun": 140
                })
                print("[Database] Firestore seeding complete.")
        except Exception as e:
            print(f"[Database] Seeding firestore failed: {e}")

    def load_local_db(self):
        try:
            with open(self.local_file, "r") as f:
                return json.load(f)
        except Exception:
            return {}

    def save_local_db(self, data):
        try:
            with open(self.local_file, "w") as f:
                json.dump(data, f, indent=4)
        except Exception as e:
            print(f"Error saving local DB: {e}")

    # --- VENDORS ---
    def get_vendors(self):
        if self.use_firestore:
            try:
                docs = self.db.collection("vendors").stream()
                vendors_list = []
                for doc in docs:
                    v = doc.to_dict()
                    v["id"] = int(v["id"])
                    vendors_list.append(v)
                return sorted(vendors_list, key=lambda x: x["id"])
            except Exception as e:
                print(f"Firestore get_vendors error: {e}")
                return DEFAULT_VENDORS
        else:
            db = self.load_local_db()
            return db.get("vendors", [])

    def add_vendor(self, vendor):
        if self.use_firestore:
            self.db.collection("vendors").document(str(vendor["id"])).set(vendor)
        else:
            db = self.load_local_db()
            db["vendors"].append(vendor)
            self.save_local_db(db)

    def toggle_vendor(self, vendor_id):
        if self.use_firestore:
            try:
                doc_ref = self.db.collection("vendors").document(str(vendor_id))
                doc = doc_ref.get()
                if doc.exists:
                    v = doc.to_dict()
                    new_state = not v.get("open", True)
                    doc_ref.update({"open": new_state})
                    return True, new_state
                return False, False
            except Exception as e:
                print(f"Firestore toggle_vendor error: {e}")
                return False, False
        else:
            db = self.load_local_db()
            for v in db["vendors"]:
                if v["id"] == vendor_id:
                    v["open"] = not v["open"]
                    self.save_local_db(db)
                    return True, v["open"]
            return False, False

    def delete_vendor(self, vendor_id):
        if self.use_firestore:
            try:
                self.db.collection("vendors").document(str(vendor_id)).delete()
                return True
            except Exception as e:
                print(f"Firestore delete_vendor error: {e}")
                return False
        else:
            db = self.load_local_db()
            initial_len = len(db["vendors"])
            db["vendors"] = [v for v in db["vendors"] if v["id"] != vendor_id]
            if len(db["vendors"]) < initial_len:
                self.save_local_db(db)
                return True
            return False

    # --- ITEMS ---
    def get_items(self):
        if self.use_firestore:
            try:
                docs = self.db.collection("items").stream()
                items_list = []
                for doc in docs:
                    item = doc.to_dict()
                    item["id"] = int(item["id"])
                    items_list.append(item)
                return sorted(items_list, key=lambda x: x["id"])
            except Exception as e:
                print(f"Firestore get_items error: {e}")
                return DEFAULT_ITEMS
        else:
            db = self.load_local_db()
            return db.get("items", [])

    # --- ORDERS ---
    def get_orders(self):
        if self.use_firestore:
            try:
                docs = self.db.collection("orders").stream()
                orders_list = []
                for doc in docs:
                    o = doc.to_dict()
                    o["id"] = int(o["id"])
                    orders_list.append(o)
                return sorted(orders_list, key=lambda x: x["id"], reverse=True)
            except Exception as e:
                print(f"Firestore get_orders error: {e}")
                return DEFAULT_ORDERS
        else:
            db = self.load_local_db()
            return db.get("orders", [])

    def add_order(self, order):
        if self.use_firestore:
            try:
                self.db.collection("orders").document(str(order["id"])).set(order)
                day = order["day"]
                totals_ref = self.db.collection("config").document("weekly_totals")
                doc = totals_ref.get()
                if doc.exists:
                    totals = doc.to_dict()
                    totals[day] = totals.get(day, 0) + 1
                    totals_ref.set(totals)
            except Exception as e:
                print(f"Firestore add_order error: {e}")
        else:
            db = self.load_local_db()
            db["orders"].insert(0, order)
            db["weekly_totals"][order["day"]] = db["weekly_totals"].get(order["day"], 0) + 1
            self.save_local_db(db)

    # --- SETTINGS ---
    def get_settings(self):
        if self.use_firestore:
            try:
                doc = self.db.collection("config").document("settings").get()
                if doc.exists:
                    return doc.to_dict()
                return DEFAULT_SETTINGS
            except Exception as e:
                print(f"Firestore get_settings error: {e}")
                return DEFAULT_SETTINGS
        else:
            db = self.load_local_db()
            return db.get("settings", DEFAULT_SETTINGS)

    def save_settings(self, settings_dict):
        if self.use_firestore:
            try:
                self.db.collection("config").document("settings").set(settings_dict)
            except Exception as e:
                print(f"Firestore save_settings error: {e}")
        else:
            db = self.load_local_db()
            db["settings"] = settings_dict
            self.save_local_db(db)

    # --- WEEKLY TOTALS ---
    def get_weekly_totals(self):
        if self.use_firestore:
            try:
                doc = self.db.collection("config").document("weekly_totals").get()
                if doc.exists:
                    return doc.to_dict()
                return {"Mon": 87, "Tue": 112, "Wed": 98, "Thu": 124, "Fri": 119, "Sat": 150, "Sun": 140}
            except Exception as e:
                print(f"Firestore get_weekly_totals error: {e}")
                return {"Mon": 87, "Tue": 112, "Wed": 98, "Thu": 124, "Fri": 119, "Sat": 150, "Sun": 140}
        else:
            db = self.load_local_db()
            return db.get("weekly_totals", {
                "Mon": 87, "Tue": 112, "Wed": 98, "Thu": 124, "Fri": 119, "Sat": 150, "Sun": 140
            })


# Initialize the database manager
db_mgr = DatabaseManager()


# --- LIVE ORDER SIMULATION BACKGROUND THREAD ---
SIMULATED_NAMES = [
    ("Rahul S", "RS"), ("Karan M", "KM"), ("Divya K", "DK"), ("Ananya G", "AG"), 
    ("Deepak T", "DT"), ("Sonia P", "SP"), ("Vijay R", "VR"), ("Arjun M", "AA")
]

def place_simulated_order():
    open_vendors = [v for v in db_mgr.get_vendors() if v["open"]]
    if not open_vendors:
        return

    vendor = random.choice(open_vendors)
    customer_name, customer_code = random.choice(SIMULATED_NAMES)
    
    vendor_cats = vendor["categories"]
    all_items = db_mgr.get_items()
    matching_items = [i for i in all_items if i["category"] in vendor_cats]
    if not matching_items:
        matching_items = all_items
        
    selected_items = random.sample(matching_items, min(len(matching_items), random.randint(1, 3)))
    
    items_count = sum(random.randint(1, 4) for _ in selected_items)
    amount = sum(item["price"] * random.randint(1, 2) for item in selected_items)
    
    all_orders = db_mgr.get_orders()
    order_id = max(o["id"] for o in all_orders) + 1 if all_orders else 4822
    current_day = "Sun"  # Assume Sunday
    
    new_order = {
        "id": order_id,
        "vendor_id": vendor["id"],
        "vendor_name": vendor["name"],
        "customer_name": customer_name,
        "customer_code": customer_code,
        "amount": amount,
        "items_count": items_count,
        "type": random.choice(["Delivery", "Pickup"]),
        "status": random.choice(["Pending", "Accepted", "Completed"]),
        "time": "Just now",
        "day": current_day
    }
    
    db_mgr.add_order(new_order)
    print(f"[Simulator] Placed order #{order_id} at {vendor['name']} for ₹{amount}")

def simulator_thread_loop():
    time.sleep(10)
    while True:
        try:
            place_simulated_order()
        except Exception as e:
            print(f"Error in order simulator loop: {e}")
        time.sleep(random.randint(20, 30))

# Start the simulator background thread
simulator_thread = threading.Thread(target=simulator_thread_loop, daemon=True)
simulator_thread.start()


# --- VIEW CONTROLLER ---
@app.route("/")
def index():
    return render_template("index.html")


# --- API ROUTES ---

# 1. Stats Endpoint
@app.route("/api/stats", methods=["GET"])
def get_stats():
    active_vendors = sum(1 for v in db_mgr.get_vendors() if v["open"])
    all_orders = db_mgr.get_orders()
    
    # Figma base specifications
    base_orders_today = 148
    base_revenue_today = 240000  # ₹2.4L
    
    # Calculate live order additions
    additional_orders = max(0, len(all_orders) - 4)
    orders_today = base_orders_today + additional_orders
    
    additional_revenue = sum(o["amount"] for o in all_orders[:-4]) if len(all_orders) > 4 else 0
    revenue_val_l = (base_revenue_today + additional_revenue) / 100000
    revenue_today_str = f"₹{round(revenue_val_l, 2)}L" if revenue_val_l >= 1 else f"₹{int(base_revenue_today + additional_revenue)}"

    pending_action = sum(1 for o in all_orders if o["status"] in ["Pending", "Accepted"])
    weekly_data = db_mgr.get_weekly_totals()

    storage_mode = "Firestore (Online)" if db_mgr.use_firestore else "Local Database (JSON)"

    return jsonify({
        "orders_today": orders_today,
        "orders_today_change": "▲ 12.4%",
        "active_vendors": active_vendors,
        "active_vendors_change": f"▲ {max(0, len(db_mgr.get_vendors()) - 8)} new",
        "revenue_today": revenue_today_str,
        "revenue_today_change": "▲ 8.1%",
        "pending_action": pending_action,
        "pending_action_change": "▼ 3 waiting",
        "weekly_totals": weekly_data,
        "storage_mode": storage_mode
    })

# 2. Vendors list
@app.route("/api/vendors", methods=["GET"])
def get_vendors():
    return jsonify(db_mgr.get_vendors())

@app.route("/api/vendors", methods=["POST"])
def add_vendor():
    data = request.json
    if not data or not data.get("name"):
        return jsonify({"error": "Invalid vendor data"}), 400
    
    all_vendors = db_mgr.get_vendors()
    new_id = max(v["id"] for v in all_vendors) + 1 if all_vendors else 1
    distance_num = round(0.5 + (new_id % 5) * 0.7, 1)
    
    new_vendor = {
        "id": new_id,
        "name": data.get("name"),
        "owner": data.get("owner", ""),
        "phone": data.get("phone", ""),
        "address": data.get("address", ""),
        "latitude": float(data.get("latitude", 22.5811)),
        "longitude": float(data.get("longitude", 88.4760)),
        "categories": data.get("categories", []),
        "distance": f"{distance_num} km",
        "rating": round(4.0 + (new_id % 10) * 0.1, 1),
        "open": data.get("open", True),
        "delivery": data.get("delivery", True),
        "delivery_radius": int(data.get("delivery_radius", 2000))
    }
    
    db_mgr.add_vendor(new_vendor)
    return jsonify(new_vendor), 201

@app.route("/api/vendors/<int:vendor_id>/toggle", methods=["POST"])
def toggle_vendor_status(vendor_id):
    success, new_state = db_mgr.toggle_vendor(vendor_id)
    if success:
        return jsonify({"success": True, "id": vendor_id, "open": new_state})
    return jsonify({"error": "Vendor not found"}), 404

@app.route("/api/vendors/<int:vendor_id>", methods=["DELETE"])
def delete_vendor(vendor_id):
    if db_mgr.delete_vendor(vendor_id):
        return jsonify({"success": True})
    return jsonify({"error": "Vendor not found"}), 404

# 3. Settings
@app.route("/api/settings", methods=["GET", "POST"])
def handle_settings():
    if request.method == "POST":
        data = request.json
        if data:
            current = db_mgr.get_settings()
            updated = {
                "discovery_radius": float(data.get("discovery_radius", current["discovery_radius"])),
                "default_delivery_fee": int(data.get("default_delivery_fee", current["default_delivery_fee"])),
                "order_model": data.get("order_model", current["order_model"])
            }
            db_mgr.save_settings(updated)
            return jsonify({"success": True, "settings": updated})
    return jsonify(db_mgr.get_settings())

# 4. Orders
@app.route("/api/orders", methods=["GET"])
def get_orders():
    return jsonify(db_mgr.get_orders())

@app.route("/api/simulate_order", methods=["POST"])
def trigger_simulation():
    try:
        place_simulated_order()
        latest = db_mgr.get_orders()[0]
        return jsonify({"success": True, "latest_order": latest})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# 5. Search
@app.route("/api/search", methods=["GET"])
def search():
    query = request.args.get("q", "").lower()
    
    if not query:
        # Default lists returned if search query is empty (returns all)
        return jsonify({
            "query": "",
            "total_results": len(db_mgr.get_items()),
            "results": {
                "vendors": db_mgr.get_vendors(),
                "items": db_mgr.get_items(),
                "orders": db_mgr.get_orders()
            }
        })
    
    matched_vendors = []
    for v in db_mgr.get_vendors():
        if query in v["name"].lower() or any(query in cat.lower() for cat in v["categories"]):
            matched_vendors.append(v)
            
    matched_items = []
    for item in db_mgr.get_items():
        if query in item["name"].lower() or query in item["category"].lower() or query in item["vendor_name"].lower():
            matched_items.append(item)
            
    matched_orders = []
    for o in db_mgr.get_orders():
        if query in str(o["id"]) or query in o["vendor_name"].lower() or query in o["customer_name"].lower():
            matched_orders.append(o)
            
    total_results = len(matched_vendors) + len(matched_items) + len(matched_orders)
    
    return jsonify({
        "query": query,
        "total_results": total_results,
        "results": {
            "vendors": matched_vendors,
            "items": matched_items,
            "orders": matched_orders
        }
    })

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5001)
