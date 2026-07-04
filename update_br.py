import re

with open('d:\\CarWash\\docs\\master\\BUSINESS_RULES.md', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace MEMBER with BRONZE where appropriate
content = content.replace("starts at tier MEMBER with", "starts at tier BRONZE with")
content = content.replace("(MEMBER shorter, PLATINUM longer)", "(BRONZE shorter, DIAMOND longer)")
content = content.replace("MEMBER=1.0x, SILVER=1.2x, GOLD=1.5x, PLATINUM=2.0x.", "BRONZE=1.0x, SILVER=1.2x, GOLD=1.5x, PLATINUM=2.0x, DIAMOND=2.5x.")
content = content.replace("MEMBER=0pts, SILVER=500pts, GOLD=1,500pts, PLATINUM=4,000pts.", "BRONZE=0pts, SILVER=500pts, GOLD=1,500pts, PLATINUM=4,000pts, DIAMOND=10,000pts.")
content = content.replace("(MEMBER=7d, SILVER=14d, GOLD=21d, PLATINUM=30d)", "(BRONZE=7d, SILVER=14d, GOLD=21d, PLATINUM=30d, DIAMOND=45d)")
content = content.replace("Reserve last slot per time slot for PLATINUM customers", "Reserve last slot per time slot for PLATINUM and DIAMOND customers")
content = content.replace("CHECK IN ('MEMBER','SILVER','GOLD','PLATINUM')", "CHECK IN ('BRONZE','SILVER','GOLD','PLATINUM','DIAMOND')")
content = content.replace("(MEMBER tier on create)", "(BRONZE tier on create)")
content = content.replace("(Platinum priority)", "(Platinum/Diamond priority)")
content = content.replace("PLATINUM=2.0x. Values differ.", "PLATINUM=2.0x, DIAMOND=2.5x. Values differ.")
content = content.replace("(Silver+ hidden from Member)", "(Silver+ hidden from Bronze)")
content = content.replace("MEMBER=7d, SILVER=10d, GOLD=12d, PLATINUM=14d", "BRONZE=7d, SILVER=10d, GOLD=12d, PLATINUM=14d, DIAMOND=30d")

# Add BR-85a
if "BR-85a" not in content:
    content = content.replace("| BR-85 | Eligible session bookings list is capped at 50 per query. | ✅ | OperationsServiceImpl.listEligibleSessionBookings() Math.min(limit, 50) |",
                              "| BR-85 | Eligible session bookings list is capped at 50 per query. | ✅ | OperationsServiceImpl.listEligibleSessionBookings() Math.min(limit, 50) |\n| BR-85a | Eligible session list displays Priority Queue badges: GOLD, PLATINUM, DIAMOND. | ⚠️ | Not implemented. See LOYALTY_TIER_RESEARCH.md |")

with open('d:\\CarWash\\docs\\master\\BUSINESS_RULES.md', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
