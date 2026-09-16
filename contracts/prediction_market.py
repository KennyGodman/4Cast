# contracts/prediction_market.py
# 4CAST Prediction Market Intelligent Contract for GenLayer Studio Next
# Compatible with GenLayer Consensus v0.6 and GenVM Python Runtime

import json
from genlayer import gl

class PredictionMarket(gl.Contract):
    """
    4CAST Decentralized Prediction Market Intelligent Contract.
    Features:
    - Native $GEN liquidity pools and betting
    - Autonomous web data extraction via gl.nondet.web.render()
    - LLM-powered resolution via gl.nondet.exec_prompt()
    - Multi-validator consensus via gl.eq_principle.strict_eq()
    - Automatic proportional winnings calculation and claim distribution
    """

    def __init__(self):
        # Array of markets stored in contract state
        # Each market: { id, title, resolution_url, criteria, end_time, category, creator, resolved, outcome, total_yes, total_no, total_pool }
        self.markets = []
        self.market_count = 0
        # bets mapping: market_id -> user_address -> { yes_amount, no_amount, claimed }
        # Serialized as JSON dictionary in state
        self.bets_json = "{}"

    def _get_bets_data(self) -> dict:
        try:
            return json.loads(self.bets_json)
        except Exception:
            return {}

    def _save_bets_data(self, data: dict):
        self.bets_json = json.dumps(data)

    @gl.public.view
    def get_market_count(self) -> int:
        """Returns the total number of markets created."""
        return len(self.markets)

    @gl.public.view
    def get_market(self, market_id: int) -> dict:
        """Returns single market data by ID."""
        for m in self.markets:
            if m["id"] == market_id:
                return m
        raise Exception(f"Market with ID {market_id} not found")

    @gl.public.view
    def get_all_markets(self) -> list:
        """Returns list of all active and resolved markets."""
        return self.markets

    @gl.public.view
    def get_user_position(self, market_id: int, user_address: str) -> dict:
        """Returns the user's YES/NO stake and claim status for a given market."""
        bets = self._get_bets_data()
        market_key = str(market_id)
        if market_key in bets and user_address.lower() in bets[market_key]:
            return bets[market_key][user_address.lower()]
        return {"yes_amount": 0, "no_amount": 0, "claimed": False}

    @gl.public.write
    def create_market(
        self,
        title: str,
        resolution_url: str,
        criteria: str,
        end_time: int,
        category: str
    ) -> int:
        """
        Creates a new binary prediction market on GenLayer.
        """
        new_id = len(self.markets) + 1
        caller = str(gl.message.sender)

        market = {
            "id": new_id,
            "title": title,
            "resolution_url": resolution_url,
            "criteria": criteria,
            "end_time": int(end_time),
            "category": category,
            "creator": caller,
            "resolved": False,
            "outcome": 0, # 0 = Pending/Unresolved, 1 = YES, 2 = NO, 3 = Invalid/Void
            "total_yes": 0,
            "total_no": 0,
            "total_pool": 0,
            "resolution_summary": "",
            "resolution_timestamp": 0
        }
        self.markets.append(market)
        return new_id

    @gl.public.write.payable
    def place_bet(self, market_id: int, outcome: int):
        """
        Place a bet in native $GEN on either YES (1) or NO (2).
        Requires positive attached transaction value.
        """
        amount = int(gl.message.value)
        if amount <= 0:
            raise Exception("Bet amount in $GEN must be greater than zero")

        if outcome not in (1, 2):
            raise Exception("Outcome must be 1 (YES) or 2 (NO)")

        caller = str(gl.message.sender).lower()
        market_found = False

        for market in self.markets:
            if market["id"] == market_id:
                market_found = True
                if market["resolved"]:
                    raise Exception("Market is already resolved")

                if outcome == 1:
                    market["total_yes"] += amount
                else:
                    market["total_no"] += amount

                market["total_pool"] += amount
                break

        if not market_found:
            raise Exception(f"Market {market_id} not found")

        # Record user bet
        bets = self._get_bets_data()
        market_key = str(market_id)
        if market_key not in bets:
            bets[market_key] = {}
        if caller not in bets[market_key]:
            bets[market_key][caller] = {"yes_amount": 0, "no_amount": 0, "claimed": False}

        if outcome == 1:
            bets[market_key][caller]["yes_amount"] += amount
        else:
            bets[market_key][caller]["no_amount"] += amount

        self._save_bets_data(bets)

    @gl.public.write
    def resolve_market(self, market_id: int) -> dict:
        """
        Resolves the market using GenLayer's Intelligent Contract capabilities:
        1. gl.nondet.web.render to fetch authoritative web data
        2. gl.nondet.exec_prompt with the validator LLM to interpret the criteria against web ground truth
        3. gl.eq_principle.strict_eq to achieve multi-validator consensus
        """
        target_market = None
        for market in self.markets:
            if market["id"] == market_id:
                target_market = market
                break

        if not target_market:
            raise Exception(f"Market {market_id} not found")

        if target_market["resolved"]:
            raise Exception("Market has already been resolved")

        resolution_url = target_market["resolution_url"]
        criteria = target_market["criteria"]
        title = target_market["title"]

        # GenLayer Consensus v0.6 Non-deterministic Web & LLM Evaluation
        def evaluate_market_resolution():
            # 1. Fetch live web ground truth via GenLayer Web Access
            web_content = ""
            if resolution_url and resolution_url.startswith("http"):
                try:
                    web_content = gl.nondet.web.render(resolution_url, mode="text")
                except Exception:
                    web_content = f"Could not fetch URL {resolution_url}"

            # 2. Formulate verification prompt for GenLayer Validator LLM
            prompt = f"""You are an objective consensus judge resolving a decentralized prediction market.
Market Title: {title}
Resolution Criteria: {criteria}
Target URL: {resolution_url}
Web Content Snapshot: {web_content[:4000]}

Determine if the event has definitively occurred based on the criteria.
Respond ONLY with a valid JSON object matching this exact schema:
{{
  "outcome": 1 for YES, 2 for NO, or 3 for UNRESOLVABLE/VOID,
  "reasoning": "A concise explanation under 200 characters"
}}
"""
            raw_response = gl.nondet.exec_prompt(prompt)
            # Parse output
            try:
                clean_json = raw_response.strip()
                if clean_json.startswith("```json"):
                    clean_json = clean_json[7:]
                if clean_json.endswith("```"):
                    clean_json = clean_json[:-3]
                parsed = json.loads(clean_json.strip())
                outcome = int(parsed.get("outcome", 3))
                reasoning = str(parsed.get("reasoning", "Resolved by AI consensus"))
                if outcome not in (1, 2, 3):
                    outcome = 3
                return json.dumps({"outcome": outcome, "reasoning": reasoning})
            except Exception:
                return json.dumps({"outcome": 3, "reasoning": "Could not parse AI response"})

        # Run under GenLayer Equivalence Principle for multi-validator agreement
        consensus_raw = gl.eq_principle.strict_eq(evaluate_market_resolution)
        consensus_data = json.loads(consensus_raw)

        target_market["resolved"] = True
        target_market["outcome"] = int(consensus_data["outcome"])
        target_market["resolution_summary"] = consensus_data["reasoning"]

        return consensus_data

    @gl.public.write
    def claim_payout(self, market_id: int) -> int:
        """
        Allows winning participants to claim their proportional share of the $GEN pool.
        """
        target_market = None
        for market in self.markets:
            if market["id"] == market_id:
                target_market = market
                break

        if not target_market:
            raise Exception(f"Market {market_id} not found")

        if not target_market["resolved"]:
            raise Exception("Market is not resolved yet")

        outcome = target_market["outcome"]
        caller = str(gl.message.sender).lower()

        bets = self._get_bets_data()
        market_key = str(market_id)

        if market_key not in bets or caller not in bets[market_key]:
            raise Exception("No bets found for caller on this market")

        user_bet = bets[market_key][caller]
        if user_bet.get("claimed", False):
            raise Exception("Payout already claimed")

        total_pool = target_market["total_pool"]
        payout = 0

        if outcome == 1: # YES won
            user_stake = user_bet["yes_amount"]
            winning_pool = target_market["total_yes"]
            if winning_pool > 0 and user_stake > 0:
                payout = (user_stake * total_pool) // winning_pool
        elif outcome == 2: # NO won
            user_stake = user_bet["no_amount"]
            winning_pool = target_market["total_no"]
            if winning_pool > 0 and user_stake > 0:
                payout = (user_stake * total_pool) // winning_pool
        elif outcome == 3: # VOID / Tie: refund initial stakes
            payout = user_bet["yes_amount"] + user_bet["no_amount"]

        if payout <= 0:
            raise Exception("No winning stake to claim")

        # Mark claimed
        user_bet["claimed"] = True
        self._save_bets_data(bets)

        # Transfer native $GEN payout to caller
        gl.transfer(gl.message.sender, payout)

        return payout
