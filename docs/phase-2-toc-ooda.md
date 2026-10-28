# Phase 2 — financial ToC/OODA page

Owner direction, October 6, 2026, verbatim:

> phase 2 of the entire app is to have a ToC OODA page. Then we have something that will change my life.

Product phase, not a delivered feature. Phase 1 achieved shared financial clarity, as reported by the owner. Current engineering work makes that working picture maintainable through a shared core; phase 2 uses it to support deliberate household action and learning.

## Journey
Observe the selected month and Home/Work/Combined scope: income, spending commitments, required obligations, debt snapshots, reimbursement status and evidence coverage. Explain what is known, estimated and missing. Do not turn a card-spending gap into a verified cash-balance change.

Orient: identify candidate constraints and their evidence, distinguish a measured constraint from a hypothesis, and consider household priorities. Select one current constraint with an owner and a success measure. Historical decisions and prior experiments remain visible; a new suggestion does not silently replace them.

Decide: compare a small set of feasible actions using the applicable ToC/OODA/premortem guidance. Record the expected effect, what could fail, the question the action tests, the simpler alternative and a review date. No automatic money transfers, payments or subscription cancellations. Suggestions involving financial choices require appropriate current evidence and user decision.

Act: track the chosen commitment and observable result, then compare expectation with what happened. Keep a small durable history of observations, decisions, outcomes and revisions; the next loop learns from that history rather than repeating a generic plan.

## Composition and provenance
Use the same evidence → facts → classifications → flows → projections as all other screens and MCP clients. The page adds domain loop records and revisioned commands, not per-widget endpoints or a second finance calculator. Every candidate constraint/action references source/projection revision, assumption, classification/reimbursement certainty and author. MCP and UI must read and curate the same loop state under the same authority.

Typed records to design: observation, constraint candidate, selected constraint, hypothesis, action/experiment, decision, outcome, review. Exact schemas and acceptance criteria come before implementation. Owner authorization is separate from model confidence. Independent validation and real household feedback are distinct evidence.

## Bounded acceptance target
A household can name one current constraint, choose one reviewable action, see which numbers support it, and return later to record whether it helped. Missing evidence is shown rather than guessed. Prior decisions survive refresh and concurrent edits. The interface is usable on a phone and exposes the same records/actions through the shared capabilities.

All five perspectives inform exploration, planning, execution and validation. Product: achievable user journey; design: phone-first contract; QA: seeded good/bad paths and retained decisions; vodka: composed boundaries; Terry: governing authority and historical decision provenance.

Do not begin a broad recommendation engine, financial automation or persona swarm before this single useful loop is demonstrated. This phase is an owner-requested next product direction, not a claim of predicted life outcomes.

## Expanded owner scope — October 6, 2026
Owner, verbatim:

> we need to consider everything from what to cut/trim/reimburse/increase income/how much to pay each cc that month and why to achieve goals like minimizing interest etc... long term goal setting such as cashflow positive as the first milestone, another milestone should be no cc interest, another should be ...

The loop compares cut, trim, reimbursement recovery, income opportunities and debt-payment allocation together. It records the expected monthly effect, evidence confidence, household/work purpose, timing, dependencies, reversibility and reason tied to the selected milestone. Reimbursement recovery is repayment of an existing work outlay, not recurring earned income or money to count twice. Potential income stays a scenario until received or supported by a commitment. No automatic cancellation, transfer or card payment.

## Milestones
Owner-specified milestones:
- Cashflow positive first: distinguish a sustainable spending margin from actual cash settlement. Verify received income/funding, internal transfers, card charges versus card payments, required debt service and opening/closing cash/debt. A dashboard spending gap alone does not prove bank cashflow. Choose an explicit target and assessment period with the household.
- No credit-card interest: verify interest charges and issuer grace-period conditions from statements. Zero interest is distinct from zero card balance, a promotional rate and pending trailing interest.

Further candidates for household selection, not adopted targets: no revolving credit-card debt; an agreed cash buffer; annual/home/travel expenses funded ahead; sustainable longer-term saving. Each milestone needs an owner, metric, target, review period, prerequisites and observed evidence. Keep goals editable and preserve why a goal changed.

## Monthly card-payment scenario
Before publishing specific payment amounts collect current balances, statement balances, due dates, minimums, APRs by balance type, promotional/deferred-interest expiration, current interest/grace-period terms, pending charges/payments and available cash after protected obligations. Missing inputs produce an explicit unresolved scenario, never invented rates or payment amounts.

Compare a feasible baseline covering required payments, extra payments allocated toward the chosen objective, and alternatives that preserve the household cash buffer or address an expiring promotion. Explain each card's proposed payment, its supported assumptions and expected impact on interest/debt/cash. Reconcile actual statements afterward. Model interest as an estimate when daily balances and timing are incomplete; do not guarantee savings or exact payoff dates.

Authoritative mechanics: CFPB explains that interest rates can differ by balance type and issuers generally apply payments above the minimum to the highest-rate balance first: https://www.consumerfinance.gov/ask-cfpb/how-does-my-credit-card-company-calculate-the-amount-of-interest-i-owe-en-51/ . CFPB explains purchase grace periods and why carrying a balance changes interest treatment: https://www.consumerfinance.gov/ask-cfpb/what-is-a-grace-period-for-a-credit-card-en-47/ . Read current sources and actual issuer terms when implementing/calculating; this document does not substitute guessed rules for account terms.

## Shared data composition
Goals, action candidates, scenarios, card terms, proposed allocations and actual outcomes are domain types. Compose queries/projections over these types and financial flows using the shared core. UI cards are renderings, not new business-rule owners or endpoints. Each scenario pins the evidence revision and preserves assumptions. Human-selected commitments are separate from agent proposals and observed results.
