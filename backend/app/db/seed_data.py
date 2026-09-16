import json
from datetime import date, datetime
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_password_hash
from app.models.role import Role
from app.models.permission import Permission
from app.models.role_permission import RolePermission
from app.models.municipality import Municipality
from app.models.user import User
from app.models.location_category import LocationCategory
from app.models.location import Location
from app.models.policy import Policy
from app.models.article import KnowledgeArticle
from app.models.waste_item import WasteItem
from app.models.report import Report
from app.services.rag_service import rag_service


def seed_initial_data(db: Session):
    # 0. Seed Municipalities
    municipalities_seed = [
        {"name": "Greater Hyderabad Municipal Corporation", "code": "GHMC", "state": "Telangana", "country": "India", "contact_email": "commissioner@ghmc.gov.in", "contact_phone": "+91 40 2111 1111"},
        {"name": "Bruhat Bengaluru Mahanagara Palike", "code": "BBMP", "state": "Karnataka", "country": "India", "contact_email": "contactus@bbmp.gov.in", "contact_phone": "+91 80 2266 0000"},
        {"name": "Municipal Corporation of Delhi", "code": "MCD", "state": "Delhi", "country": "India", "contact_email": "info@mcd.gov.in", "contact_phone": "+91 11 2322 0010"}
    ]
    mun_map = {}
    for m_data in municipalities_seed:
        m_obj = db.query(Municipality).filter(Municipality.code == m_data["code"]).first()
        if not m_obj:
            m_obj = Municipality(**m_data)
            db.add(m_obj)
            db.commit()
            db.refresh(m_obj)
        mun_map[m_data["code"]] = m_obj

    # 1. Seed Permissions
    permissions_seed = [
        # Locations
        {"code": "location.view", "name": "View Facilities", "category": "locations", "description": "View disposal locations, bins, and recycling centers"},
        {"code": "location.create", "name": "Create Facility", "category": "locations", "description": "Register a new disposal facility or dustbin"},
        {"code": "location.update", "name": "Update Facility", "category": "locations", "description": "Edit facility details, operational hours, or waste types"},
        {"code": "location.delete", "name": "Delete Facility", "category": "locations", "description": "Archive or remove a disposal facility"},
        # Reports
        {"code": "report.view", "name": "View Reports", "category": "reports", "description": "View citizen issue reports and clean-up tickets"},
        {"code": "report.create", "name": "Submit Report", "category": "reports", "description": "Report overflowing dustbin or illegal dumping"},
        {"code": "report.update", "name": "Manage Report", "category": "reports", "description": "Dispatch crew and update ticket status to Resolved"},
        # Policies
        {"code": "policy.view", "name": "View Policies", "category": "policies", "description": "Read statutory waste management policies and rules"},
        {"code": "policy.create", "name": "Publish Policy", "category": "policies", "description": "Publish government gazettes and waste directives"},
        {"code": "policy.update", "name": "Edit Policy", "category": "policies", "description": "Update statutory circulars and penal clauses"},
        {"code": "policy.delete", "name": "Archive Policy", "category": "policies", "description": "Remove or supersede past regulations"},
        # Knowledge & AI
        {"code": "knowledge.create", "name": "Ingest Documents", "category": "knowledge", "description": "Upload PDF, DOCX circulars for RAG indexing"},
        {"code": "knowledge.update", "name": "Edit Articles", "category": "knowledge", "description": "Modify educational guides and recycling content"},
        {"code": "knowledge.delete", "name": "Delete Knowledge", "category": "knowledge", "description": "Remove indexed documents or articles"},
        # Users & Roles
        {"code": "user.view", "name": "View Users", "category": "users", "description": "Inspect registered citizens, operators, and staff"},
        {"code": "user.update", "name": "Manage User Status", "category": "users", "description": "Suspend, activate, or update user profiles"},
        {"code": "role.manage", "name": "Manage RBAC Matrix", "category": "users", "description": "Modify role definitions and permission mappings"},
        # System & Audit
        {"code": "audit.view", "name": "Inspect Audit Trail", "category": "system", "description": "View immutable enterprise access and mutation logs"},
        {"code": "system.manage", "name": "Configure Platform", "category": "system", "description": "Modify Groq AI model settings and municipal scoping"}
    ]
    perm_map = {}
    for p_data in permissions_seed:
        p_obj = db.query(Permission).filter(Permission.code == p_data["code"]).first()
        if not p_obj:
            p_obj = Permission(**p_data)
            db.add(p_obj)
            db.commit()
            db.refresh(p_obj)
        perm_map[p_data["code"]] = p_obj

    # 2. Seed 5 Default Roles
    roles_def = [
        {"name": "SuperAdmin", "description": "System-wide root administrator with absolute authority"},
        {"name": "Admin", "description": "Municipal director with full administrative oversight"},
        {"name": "MunicipalOperator", "description": "Field inspector managing regional complaints and facilities"},
        {"name": "ContentManager", "description": "Curator managing environmental guides, policies, and AI RAG knowledge"},
        {"name": "Citizen", "description": "Resident with search, facility locating, issue reporting, and chat privileges"}
    ]
    role_map = {}
    for r_data in roles_def:
        r_obj = db.query(Role).filter(Role.name == r_data["name"]).first()
        if not r_obj:
            r_obj = Role(**r_data)
            db.add(r_obj)
            db.commit()
            db.refresh(r_obj)
        role_map[r_data["name"]] = r_obj

    # Map Permissions to Roles
    role_permission_assignments = {
        "SuperAdmin": list(perm_map.keys()),
        "Admin": [
            "location.view", "location.create", "location.update", "location.delete",
            "report.view", "report.create", "report.update",
            "policy.view", "policy.create", "policy.update", "policy.delete",
            "knowledge.create", "knowledge.update", "knowledge.delete",
            "user.view", "user.update", "role.manage", "audit.view", "system.manage"
        ],
        "MunicipalOperator": [
            "location.view", "location.create", "location.update",
            "report.view", "report.update", "policy.view"
        ],
        "ContentManager": [
            "policy.view", "policy.create", "policy.update",
            "knowledge.create", "knowledge.update", "knowledge.delete",
            "location.view", "report.view"
        ],
        "Citizen": [
            "location.view", "report.create", "report.view", "policy.view"
        ]
    }

    for role_name, perm_codes in role_permission_assignments.items():
        role_obj = role_map[role_name]
        for p_code in perm_codes:
            perm_obj = perm_map[p_code]
            exists = db.query(RolePermission).filter(
                RolePermission.role_id == role_obj.id,
                RolePermission.permission_id == perm_obj.id
            ).first()
            if not exists:
                db.add(RolePermission(role_id=role_obj.id, permission_id=perm_obj.id))
    db.commit()

    # 3. Seed Default Accounts
    users_to_seed = [
        {
            "email": "superadmin@wastecare.gov",
            "password": "SuperAdmin@123456",
            "full_name": "Chief Platform Architect",
            "phone": "+91 99000 00001",
            "role_id": role_map["SuperAdmin"].id,
            "municipality_id": mun_map["GHMC"].id,
            "status": "Active",
            "email_verified": True,
            "environmental_score": 500
        },
        {
            "email": settings.ADMIN_EMAIL.lower(),
            "password": settings.ADMIN_PASSWORD,
            "full_name": "Municipal Admin Officer",
            "phone": "+91 98765 43210",
            "role_id": role_map["Admin"].id,
            "municipality_id": mun_map["GHMC"].id,
            "status": "Active",
            "email_verified": True,
            "environmental_score": 350
        },
        {
            "email": "operator@ghmc.gov.in",
            "password": "Operator@123456",
            "full_name": "Rajesh Kumar (GHMC Field Lead)",
            "phone": "+91 98480 12345",
            "role_id": role_map["MunicipalOperator"].id,
            "municipality_id": mun_map["GHMC"].id,
            "status": "Active",
            "email_verified": True,
            "environmental_score": 200
        },
        {
            "email": "content@wastecare.gov",
            "password": "Content@123456",
            "full_name": "Dr. Ananya Sen (Environmental Specialist)",
            "phone": "+91 98300 54321",
            "role_id": role_map["ContentManager"].id,
            "municipality_id": mun_map["BBMP"].id,
            "status": "Active",
            "email_verified": True,
            "environmental_score": 280
        },
        {
            "email": settings.CITIZEN_EMAIL.lower(),
            "password": settings.CITIZEN_PASSWORD,
            "full_name": "Priya Sharma",
            "phone": "+91 91234 56789",
            "role_id": role_map["Citizen"].id,
            "municipality_id": mun_map["GHMC"].id,
            "status": "Active",
            "email_verified": True,
            "environmental_score": 120
        }
    ]

    for u_spec in users_to_seed:
        u_obj = db.query(User).filter(User.email == u_spec["email"]).first()
        if not u_obj:
            u_obj = User(
                email=u_spec["email"],
                hashed_password=get_password_hash(u_spec["password"]),
                full_name=u_spec["full_name"],
                phone=u_spec["phone"],
                role_id=u_spec["role_id"],
                municipality_id=u_spec["municipality_id"],
                status=u_spec["status"],
                email_verified=u_spec["email_verified"],
                environmental_score=u_spec["environmental_score"],
                is_active=True
            )
            db.add(u_obj)
        else:
            # Update password with Argon2
            u_obj.hashed_password = get_password_hash(u_spec["password"])
            u_obj.role_id = u_spec["role_id"]
            u_obj.municipality_id = u_spec["municipality_id"]
            u_obj.status = u_spec["status"]
            u_obj.email_verified = u_spec["email_verified"]
            u_obj.environmental_score = u_spec["environmental_score"]
    db.commit()

    admin_user = db.query(User).filter(User.email == settings.ADMIN_EMAIL.lower()).first()
    citizen_user = db.query(User).filter(User.email == settings.CITIZEN_EMAIL.lower()).first()

    # 3. Seed Location Categories
    categories_data = [
        {
            "name": "Public Smart Dustbin",
            "code": "dustbin",
            "icon": "trash-2",
            "color": "#10B981",
            "description": "Street-level dual/triple segregation bins with fill-level monitoring"
        },
        {
            "name": "Recycling Center",
            "code": "recycling",
            "icon": "recycle",
            "color": "#3B82F6",
            "description": "Drop-off and sorting hubs for paper, cardboard, metals, and clean rigid plastics"
        },
        {
            "name": "E-Waste Collection Hub",
            "code": "e_waste",
            "icon": "cpu",
            "color": "#8B5CF6",
            "description": "Authorized EPR collection centers for computers, phones, circuit boards, and batteries"
        },
        {
            "name": "Hazardous & Biomedical Depot",
            "code": "hazardous",
            "icon": "alert-triangle",
            "color": "#EF4444",
            "description": "Certified containment sites for domestic chemicals, paints, pesticides, and medical sharps"
        }
    ]

    cat_map = {}
    for c in categories_data:
        cat_obj = db.query(LocationCategory).filter(LocationCategory.code == c["code"]).first()
        if not cat_obj:
            cat_obj = LocationCategory(**c)
            db.add(cat_obj)
            db.commit()
            db.refresh(cat_obj)
        cat_map[c["code"]] = cat_obj

    # 4. Seed Facilities & Dustbins
    if db.query(Location).count() == 0:
        locations_data = [
            {
                "name": "Central Park Smart Dustbin #101",
                "description": "Solar-powered compactor bin with automated fill sensor.",
                "category_id": cat_map["dustbin"].id,
                "latitude": 12.9716,
                "longitude": 77.5946,
                "address": "Gate 2, Cubbon Park Road",
                "city": "Bengaluru",
                "postal_code": "560001",
                "accepted_waste_types": ["Wet Food Waste", "Dry Paper/Cans"],
                "operating_hours": {"Mon-Sun": "24 Hours"},
                "contact_phone": "+91 80 2222 1000",
                "created_by_id": admin_user.id
            },
            {
                "name": "Metro Station Dual Bin Hub",
                "description": "Pedestrian transit segregation bins.",
                "category_id": cat_map["dustbin"].id,
                "latitude": 12.9754,
                "longitude": 77.6066,
                "address": "MG Road Metro Station Concourse",
                "city": "Bengaluru",
                "postal_code": "560001",
                "accepted_waste_types": ["Plastic Bottles", "Paper Cups", "Snack Wrappers"],
                "operating_hours": {"Mon-Sun": "06:00 - 23:00"},
                "contact_phone": "+91 80 2222 1001",
                "created_by_id": admin_user.id
            },
            {
                "name": "EcoGreen Material Recovery Facility",
                "description": "Full-scale dry waste sorting facility accepting bulk recyclables, corrugated cardboard, and metals.",
                "category_id": cat_map["recycling"].id,
                "latitude": 12.9602,
                "longitude": 77.6485,
                "address": "14th Main Rd, Indiranagar",
                "city": "Bengaluru",
                "postal_code": "560038",
                "accepted_waste_types": ["Cardboard", "Newspaper", "PET Bottles", "Aluminium Cans", "Glass Containers"],
                "operating_hours": {"Mon-Sat": "08:00 - 18:00", "Sun": "09:00 - 14:00"},
                "contact_phone": "+91 80 4123 4567",
                "created_by_id": admin_user.id
            },
            {
                "name": "Civic Dry Waste Collection Center (DWCC)",
                "description": "Ward-level sorting hub operated by certified waste pickers collective.",
                "category_id": cat_map["recycling"].id,
                "latitude": 12.9352,
                "longitude": 77.6245,
                "address": "80 Feet Rd, 4th Block, Koramangala",
                "city": "Bengaluru",
                "postal_code": "560034",
                "accepted_waste_types": ["HDPE Plastics", "Tetra Pak Cartons", "Scrap Metal", "Clear Glass"],
                "operating_hours": {"Mon-Sat": "09:00 - 17:00"},
                "contact_phone": "+91 80 4234 5678",
                "created_by_id": admin_user.id
            },
            {
                "name": "ElectroCycle Authorized E-Waste Hub",
                "description": "Government CPCB-authorized EPR drop-off point for electronics, appliances, and batteries.",
                "category_id": cat_map["e_waste"].id,
                "latitude": 12.9904,
                "longitude": 77.5532,
                "address": "Rajajinagar Industrial Area, Phase 2",
                "city": "Bengaluru",
                "postal_code": "560010",
                "accepted_waste_types": ["Laptops", "Smartphones", "Lithium Batteries", "Circuit Boards", "Televisions", "Printers"],
                "operating_hours": {"Mon-Fri": "09:30 - 18:00", "Sat": "10:00 - 15:00"},
                "contact_phone": "+91 80 2345 6789",
                "created_by_id": admin_user.id
            },
            {
                "name": "TechPark E-Waste Drop Box",
                "description": "Secure consumer electronic deposit kiosk for small gadgets and chargers.",
                "category_id": cat_map["e_waste"].id,
                "latitude": 12.9250,
                "longitude": 77.6835,
                "address": "Bellandur Outer Ring Road",
                "city": "Bengaluru",
                "postal_code": "560103",
                "accepted_waste_types": ["Mobile Phones", "Chargers", "Cables", "Keyboards", "Button Cells"],
                "operating_hours": {"Mon-Sun": "08:00 - 20:00"},
                "contact_phone": "+91 80 2456 7890",
                "created_by_id": admin_user.id
            },
            {
                "name": "State Hazardous & Biomedical Containment Center",
                "description": "Specialized municipal facility equipped for domestic bio-hazards, expired pharmaceuticals, and paints.",
                "category_id": cat_map["hazardous"].id,
                "latitude": 12.9121,
                "longitude": 77.6012,
                "address": "Bannerghatta Link Road, BTM Layout 2nd Stage",
                "city": "Bengaluru",
                "postal_code": "560076",
                "accepted_waste_types": ["Expired Medicines", "Syringes & Needles", "Pesticides", "Solvents", "Lead-Acid Batteries", "Fluorescent Tubes"],
                "operating_hours": {"Mon-Sat": "09:00 - 16:30"},
                "contact_phone": "+91 80 2678 9012",
                "created_by_id": admin_user.id
            },
            {
                "name": "South City Household Hazard Drop-Off",
                "description": "Secure containment kiosks for domestic hazardous waste products.",
                "category_id": cat_map["hazardous"].id,
                "latitude": 12.8985,
                "longitude": 77.5850,
                "address": "JP Nagar 7th Phase, Near Water Tank",
                "city": "Bengaluru",
                "postal_code": "560078",
                "accepted_waste_types": ["Aerosol Spray Cans", "Motor Oil", "Paint Residue", "Bleach & Corrosives"],
                "operating_hours": {"Tue-Sat": "10:00 - 16:00"},
                "contact_phone": "+91 80 2789 0123",
                "created_by_id": admin_user.id
            }
        ]

        for loc_data in locations_data:
            types = loc_data.pop("accepted_waste_types")
            hours = loc_data.pop("operating_hours")
            loc = Location(**loc_data)
            loc.accepted_waste_types = types
            loc.operating_hours = hours
            db.add(loc)
        db.commit()

    # 5. Seed Government Policies
    if db.query(Policy).count() == 0:
        policies_data = [
            {
                "title": "Solid Waste Management Rules 2016",
                "authority": "Ministry of Environment, Forest and Climate Change (MoEFCC)",
                "category": "Solid Waste",
                "document_number": "S.O. 1357(E)",
                "effective_date": date(2016, 4, 8),
                "summary": "Mandates mandatory segregation of waste at source into three streams: bio-degradable (wet), non-biodegradable (dry), and domestic hazardous. Establishes duties of waste generators and local authorities.",
                "full_text": (
                    "Rule 4: Duties of Waste Generators -\n"
                    "1. Every waste generator shall segregate and store waste generated by them in three separate streams, "
                    "namely bio-degradable, non-bio-degradable, and domestic hazardous wastes in suitable bins.\n"
                    "2. Wrap securely used sanitary waste such as diapers and sanitary pads in pouches provided by manufacturers "
                    "or suitable wrapping material and place in the dry/sanitary waste bin.\n"
                    "3. Construction and demolition waste must be separately stored and disposed of as per C&D rules.\n"
                    "4. No waste generator shall throw, burn, or bury solid waste on streets, open public spaces, or in drains.\n"
                    "Rule 15: Duties of Local Authorities -\n"
                    "Establish door-to-door waste collection systems, secondary storage depots, material recovery facilities (MRF), "
                    "and scientific composting or biomethanation plants."
                ),
                "file_url": "https://cpcb.nic.in/displaypdf.php?id=c29saWR3YXN0ZS9TV01fUnVsZXNfMjAxNi5wZGY="
            },
            {
                "title": "E-Waste (Management) Rules 2022",
                "authority": "Central Pollution Control Board (CPCB)",
                "category": "E-Waste",
                "document_number": "G.S.R. 801(E)",
                "effective_date": date(2023, 4, 1),
                "summary": "Imposes strict Extended Producer Responsibility (EPR) targets on electronics producers. Mandates that consumers channelize electronic waste and batteries through authorized collection centers.",
                "full_text": (
                    "Chapter II: Responsibilities of Consumers and Bulk Consumers -\n"
                    "1. Ensure that end-of-life electrical and electronic equipment (EEE) is deposited exclusively with authorized collection centers, "
                    "registered recyclers, or returned via producer buy-back schemes.\n"
                    "2. Ensure that e-waste containing radioactive material or toxic batteries is not commingled with municipal solid waste.\n"
                    "3. Never dismantle, crush, or extract components from electronics using unorganized, informal, or open-air acid bath techniques.\n"
                    "Chapter III: Hazardous Substances Restriction (RoHS) -\n"
                    "Restricts the concentration of lead, mercury, hexavalent chromium, polybrominated biphenyls, and cadmium in new equipment."
                ),
                "file_url": "https://cpcb.nic.in/uploads/Projects/E-Waste/e-waste_rules_2022.pdf"
            },
            {
                "title": "Plastic Waste Management (Amendment) Rules 2024",
                "authority": "MoEFCC",
                "category": "Plastic Waste",
                "document_number": "G.S.R. 182(E)",
                "effective_date": date(2024, 3, 15),
                "summary": "Prohibits single-use plastic (SUP) commodities having low utility and high littering potential. Introduces QR-coded traceability and recycled plastic content quotas.",
                "full_text": (
                    "Rule 4: Conditions for Plastic Manufacture, Sale, and Use -\n"
                    "1. The manufacture, import, stocking, distribution, sale and use of single-use plastic items including ear buds with plastic sticks, "
                    "plastic cutlery, wrapping films around sweet boxes, and PVC banners less than 100 microns is completely prohibited.\n"
                    "2. Carry bags made of virgin or recycled plastic shall not be less than 120 microns in thickness.\n"
                    "3. Non-woven plastic carry bags must not be less than 60 GSM.\n"
                    "Rule 9: Extended Producer Responsibility (EPR) for Packaging -\n"
                    "Rigid plastic packaging (Category I), flexible single layer/multi-layer (Category II), and compostable plastics must be registered "
                    "on the national CPCB centralized portal with verifiable mass-balance recycling credits."
                ),
                "file_url": "https://cpcb.nic.in/plastic-waste-rules/"
            },
            {
                "title": "Bio-Medical Waste Management Rules 2016",
                "authority": "CPCB & State Pollution Control Boards",
                "category": "Biomedical Waste",
                "document_number": "G.S.R. 343(E)",
                "effective_date": date(2016, 3, 28),
                "summary": "Defines color-coded segregation bins (Yellow, Red, White, Blue) for medical sharps, infectious anatomical waste, expired pharmaceuticals, and contaminated glassware.",
                "full_text": (
                    "Schedule I: Color Coding and Container Specification -\n"
                    "- Yellow Bin: Human and animal anatomical waste, soiled cotton, plaster casts, expired or discarded cytotoxic medicines.\n"
                    "- Red Bin: Contaminated recyclable plastics (catheters, tubing, intravenous bottles, syringes without needles).\n"
                    "- White (Translucent Puncture-Proof): Needles, scalpels, blades, fixed needles sharps.\n"
                    "- Blue Bin: Broken or discarded contaminated glass medicine vials, ampoules, and orthopedic implants.\n"
                    "Household Guideline: Domestic medical waste (syringes, test strips) must be packed in puncture-resistant containers and handed over to designated bio-hazard counters."
                ),
                "file_url": "https://cpcb.nic.in/bio-medical-waste-rules/"
            },
            {
                "title": "Hazardous and Other Wastes Rules 2016",
                "authority": "MoEFCC",
                "category": "Hazardous Waste",
                "document_number": "G.S.R. 395(E)",
                "effective_date": date(2016, 4, 4),
                "summary": "Governs the environmentally sound management, storage, transportation, and recycling of chemical wastes, spent solvents, lead-acid batteries, and toxic residues.",
                "full_text": (
                    "Rule 17: Packaging and Labeling of Hazardous Waste -\n"
                    "1. Hazardous containers shall be marked with yellow fluorescent background labels and danger hazard symbols.\n"
                    "2. Transportation must use GPS-tracked vehicles equipped with manifest tracking systems (Form 10).\n"
                    "3. Domestic chemical containers (bleach, pesticides, varnishes) must never be poured into sanitary sewers or storm water drains."
                ),
                "file_url": "https://cpcb.nic.in/hazardous-waste-rules/"
            }
        ]

        for p_data in policies_data:
            policy = Policy(**p_data)
            db.add(policy)
            db.commit()
            db.refresh(policy)
            # Ingest policy into vector store
            rag_service.ingest_policy(db, policy)

    # 6. Seed Knowledge Articles
    if db.query(KnowledgeArticle).count() == 0:
        articles_data = [
            {
                "title": "Complete Guide to 3-Way Waste Segregation at Source",
                "slug": "complete-guide-waste-segregation-at-source",
                "category": "Segregation",
                "summary": "Master the green, blue, and red bin system to ensure 90%+ of your household waste stays out of landfills.",
                "read_time": "5 min read",
                "infographic_url": "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=1200&q=80",
                "tags": ["segregation", "recycling", "green-bin", "dry-waste"],
                "content": (
                    "Proper waste segregation at source is the single most impactful action a household can take for municipal sustainability.\n\n"
                    "### 1. The Green Bin: Wet Biodegradable Waste\n"
                    "Includes kitchen fruit and vegetable peels, cooked leftovers, eggshells, tea bags, coffee grounds, and garden leaves. "
                    "Keep this stream completely free of plastic liners, twist ties, or staples. This organic material is processed into nutrient-rich compost or biomethane gas.\n\n"
                    "### 2. The Blue Bin: Dry Recyclable Waste\n"
                    "Includes paper, corrugated boxes, cleaned milk packets, shampoo bottles, soda cans, and packaging cardboard. "
                    "Rule of thumb: rinse and dry containers before tossing. Contaminated food residue on plastics can spoil an entire batch of recyclables.\n\n"
                    "### 3. The Red Bin: Domestic Hazardous & Sanitary Waste\n"
                    "Includes diapers, sanitary pads, band-aids, razor blades, expired tablets, CFL tubes, and pesticide bottles. "
                    "Sanitary waste must be securely wrapped in newspaper or biodegradable pouches marked with a red dot."
                )
            },
            {
                "title": "How to Safely Handle & Dispose of Lithium-Ion Batteries",
                "slug": "how-to-safely-dispose-lithium-batteries",
                "category": "E-Waste Safety",
                "summary": "Lithium batteries contain volatile chemicals that cause severe garbage truck and landfill fires when punctured.",
                "read_time": "4 min read",
                "infographic_url": "https://images.unsplash.com/photo-1619725002198-6a689b72f41d?auto=format&fit=crop&w=1200&q=80",
                "tags": ["batteries", "e-waste", "fire-safety", "hazardous"],
                "content": (
                    "Lithium-ion batteries power our smartphones, laptops, power tools, and vape devices. However, discarded batteries are responsible for over 40% of waste-facility fires globally.\n\n"
                    "### Safety Rules for Battery Disposal:\n"
                    "1. **Never throw in regular trash**: Municipal waste trucks compress trash with immense hydraulic pressure. Punctured lithium cells undergo thermal runaway and burst into flames.\n"
                    "2. **Tape the terminals**: Place a strip of non-conductive electrical tape or scotch tape over the metallic positive and negative contact points to prevent short-circuits during transit.\n"
                    "3. **Store in a cool, non-metal container**: Keep spent batteries in a dry cardboard box away from flammable liquids.\n"
                    "4. **Drop off at certified e-waste hubs**: Take them to an authorized CPCB e-waste center or participating electronics store drop box."
                )
            },
            {
                "title": "Home Composting 101: Turning Kitchen Scraps into Black Gold",
                "slug": "home-composting-101-kitchen-scraps",
                "category": "Composting",
                "summary": "Step-by-step instructions for aerobic apartment composting without foul odors or pests.",
                "read_time": "6 min read",
                "infographic_url": "https://images.unsplash.com/photo-1584473457406-6240486418e9?auto=format&fit=crop&w=1200&q=80",
                "tags": ["composting", "zero-waste", "organic", "gardening"],
                "content": (
                    "Over 55% of all household waste is compostable organic matter. Here is how you can set up a simple odor-free composting bin at home.\n\n"
                    "### The Golden Ratio: 2 Parts Brown to 1 Part Green\n"
                    "- **Greens (Nitrogen-rich)**: Vegetable ends, fruit skins, coffee grounds, fresh lawn clippings.\n"
                    "- **Browns (Carbon-rich)**: Dry leaves, coco peat, sawdust, shredded unbleached cardboard, egg cartons.\n\n"
                    "### Aerobic Method:\n"
                    "1. Drill several ventilation holes around a 20-litre terracotta or plastic tub.\n"
                    "2. Place a base layer of dry coco peat or crushed leaves.\n"
                    "3. Add your daily kitchen scraps, followed by a double layer of browns.\n"
                    "4. Turn the pile once a week with a hand trowel to introduce oxygen. In 4 to 6 weeks, you will have rich, dark, earthy compost for your plants!"
                )
            },
            {
                "title": "Demystifying Plastic Resin Identification Codes (1 to 7)",
                "slug": "plastic-resin-codes-guide",
                "category": "Recycling",
                "summary": "Understand what the tiny chasing arrow triangle numbers at the bottom of your plastics really mean.",
                "read_time": "4 min read",
                "infographic_url": "https://images.unsplash.com/photo-1567095761054-7a02e69e5c43?auto=format&fit=crop&w=1200&q=80",
                "tags": ["plastics", "codes", "recycling-tips", "materials"],
                "content": (
                    "Not all plastics are created equal. The Resin Identification Code (RIC) helps sorting centers identify the base polymer.\n\n"
                    "- **#1 PET (Polyethylene Terephthalate)**: Water and soda bottles. Highly recyclable into polyester fiber and new bottles.\n"
                    "- **#2 HDPE (High-Density Polyethylene)**: Milk jugs, detergent bottles, shampoo containers. Highly recyclable into pipes and crates.\n"
                    "- **#3 PVC (Polyvinyl Chloride)**: Pipes, vinyl siding, blister packs. Rarely recycled curbside; contains toxic additives.\n"
                    "- **#4 LDPE (Low-Density Polyethylene)**: Grocery bags, squeeze bottles. Recyclable through specialized soft plastic programs.\n"
                    "- **#5 PP (Polypropylene)**: Yogurt tubs, bottle caps, takeout food containers. Increasingly recycled into automotive parts.\n"
                    "- **#6 PS (Polystyrene / Thermocol)**: Foam packaging, disposable cups. Extremely difficult to recycle curbside due to low density.\n"
                    "- **#7 Other (BPA, Polycarbonate, Multi-layers)**: Chip bags, composite packaging. Requires specialized waste-to-energy or pyrolysis processing."
                )
            }
        ]

        for a_data in articles_data:
            tags = a_data.pop("tags")
            art = KnowledgeArticle(**a_data)
            art.tags = tags
            db.add(art)
            db.commit()
            db.refresh(art)
            # Ingest article into vector store
            rag_service.ingest_article(db, art)

    # 7. Seed Common Waste Items Catalog (300+ Preloaded Items)
    if db.query(WasteItem).count() < 300:
        import os
        seeds_json_path = os.path.join(os.path.dirname(__file__), "seeds", "waste_items.json")
        loaded_items = []
        if os.path.exists(seeds_json_path):
            with open(seeds_json_path, "r", encoding="utf-8") as f:
                loaded_items = json.load(f)
        
        if not loaded_items:
            # Fallback inline catalog
            loaded_items = [
                {
                    "name": "Plastic Water Bottle (PET)",
                    "aliases": ["pet bottle", "soda bottle", "beverage container"],
                    "category": "Plastic",
                    "segregation_bin": "Dry (Blue)",
                    "disposal_method": "Empty liquid, rinse residue, crush flat, and replace cap before placing in blue dry recycling bin.",
                    "recycling_guidance": "100% recyclable into polyester fleece yarn, geotextiles, and new bottle packaging.",
                    "safety_precautions": "Do not burn plastic bottles as open combustion releases harmful carcinogens and dioxins.",
                    "target_facility_code": "recycling"
                },
                {
                    "name": "Lithium-Ion Battery",
                    "aliases": ["phone battery", "laptop battery", "li-ion cell", "power bank"],
                    "category": "Electronic",
                    "segregation_bin": "E-Waste (Grey)",
                    "disposal_method": "Cover terminal contacts with non-conductive tape and hand over directly to an authorized E-Waste Collection Hub.",
                    "recycling_guidance": "Specialized hydrometallurgical recovery extracts cobalt, nickel, and battery-grade lithium.",
                    "safety_precautions": "Never throw in general trash or crush. High risk of violent thermal runaway and toxic chemical fires.",
                    "target_facility_code": "e_waste"
                }
            ]

        for item_data in loaded_items:
            item_dict = dict(item_data)
            # Pop id if present to allow model generation or update
            if "id" in item_dict:
                existing_item = db.query(WasteItem).filter(WasteItem.id == item_dict["id"]).first()
                if existing_item:
                    continue
            aliases = item_dict.pop("aliases", [])
            item = WasteItem(**item_dict)
            item.aliases = aliases
            db.add(item)
        db.commit()

    # 8. Seed Issue Reports
    if db.query(Report).count() == 0:
        reports_data = [
            {
                "user_id": citizen_user.id,
                "category": "Overflowing Bin",
                "description": "Public dustbin near Central Park Gate 2 has been overflowing with packaging waste since yesterday evening.",
                "latitude": 12.9720,
                "longitude": 77.5950,
                "address": "Gate 2, Cubbon Park Road, Bengaluru",
                "status": "In Progress",
                "admin_notes": "Sanitation sweep vehicle assigned for clearance at 16:00."
            },
            {
                "user_id": citizen_user.id,
                "category": "Illegal Dumping",
                "description": "Unattended construction debris and commercial plastic waste dumped along the vacant plot next to bus stop.",
                "latitude": 12.9610,
                "longitude": 77.6490,
                "address": "14th Main Rd, Indiranagar, Bengaluru",
                "status": "Open",
                "admin_notes": None
            },
            {
                "user_id": citizen_user.id,
                "category": "Missing Dustbin",
                "description": "The dual segregation bin previously located at the metro pedestrian walkway was damaged and removed. A replacement is needed.",
                "latitude": 12.9750,
                "longitude": 77.6070,
                "address": "MG Road Walkway, Bengaluru",
                "status": "Resolved",
                "admin_notes": "New heavy-duty twin-compartment smart bin installed and anchored.",
                "resolved_by_id": admin_user.id
            }
        ]

        for r_data in reports_data:
            report = Report(**r_data)
            db.add(report)
        db.commit()

    print("[Seed Data] Database populated successfully with all initial records and RAG embeddings!")
