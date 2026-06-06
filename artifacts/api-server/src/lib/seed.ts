import { db } from "@workspace/db";
import {
  topicsTable,
  lecturesTable,
  assignmentsTable,
  problemsTable,
} from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

type SeedTopic = {
  slug: string;
  title: string;
  weekNumber: number;
  blurb: string;
  lectureTitle: string;
  body: string;
};

const TOPICS: SeedTopic[] = [
  // ───────────────────────────────────────────────────────────────
  // Unit 1 — Whole numbers, integers, and operations
  // ───────────────────────────────────────────────────────────────
  {
    slug: "whole-numbers-place-value",
    title: "Whole numbers and place value",
    weekNumber: 1,
    blurb: "How position gives a digit its value.",
    lectureTitle: "1.1 Whole numbers and place value",
    body: `# Whole numbers and place value

The **whole numbers** are $0, 1, 2, 3, \\ldots$ — the numbers we use to count. We write them with just ten symbols, the digits $0$ through $9$. The reason ten symbols are enough to write *any* whole number, no matter how large, is **place value**.

## What place value means

In our base-ten system, a digit's value depends on *where* it sits. In the number $4{,}072$:

- the $4$ is in the **thousands** place, so it means $4 \\times 1000$,
- the $0$ is in the **hundreds** place ($0 \\times 100$),
- the $7$ is in the **tens** place ($7 \\times 10$),
- the $2$ is in the **ones** place ($2 \\times 1$).

So the number in **expanded form** is

$$4072 = 4 \\times 1000 + 0 \\times 100 + 7 \\times 10 + 2 \\times 1.$$

Each place is worth ten times the place to its right. That single rule — place value is the quiet engine behind every calculation you will ever do — is what lets us add, subtract, multiply, and divide by working one column at a time.

## Reading and comparing

Because larger places sit to the left, comparing whole numbers is just comparing digits from the left: $4072 > 3999$ even though $3999$ has bigger-looking digits, because the thousands place decides first.

## A historical example

For most of history, people wrote numbers *without* place value. Roman numerals spell out $\\text{MMXXIV}$ for $2024$ — there is no "place," so there is no column to carry in, and multiplication was a job for specialists with an abacus. The Hindu–Arabic place-value system, carried to Europe by Fibonacci's *Liber Abaci* in $1202$, replaced all of that with ten digits and a symbol for "nothing here," $0$. It is hard to overstate how much arithmetic that one idea unlocked.`,
  },
  {
    slug: "addition-subtraction",
    title: "Addition and subtraction",
    weekNumber: 1,
    blurb: "Combining and taking away, and why they undo each other.",
    lectureTitle: "1.2 Addition and subtraction",
    body: `# Addition and subtraction

**Addition** combines quantities; **subtraction** takes one quantity away from another. They are the two most basic operations, and they are **inverse** operations: each one undoes the other.

## Carrying and borrowing

Place value is what makes column addition work. When a column adds to more than $9$, we **carry** the extra into the next place:

$$27 + 48: \\quad 7 + 8 = 15 \\;\\Rightarrow\\; \\text{write } 5, \\text{ carry } 1; \\quad 1 + 2 + 4 = 7 \\;\\Rightarrow\\; 75.$$

Subtraction reverses this: when a column is too small, we **borrow** ten from the place to the left.

## Inverse operations

Addition and subtraction are tied together by a single fact:

$$\\text{if } a + b = c, \\quad \\text{then } c - b = a \\ \\text{ and } \\ c - a = b.$$

So $8 + 5 = 13$ immediately gives you the two subtraction facts $13 - 5 = 8$ and $13 - 8 = 5$. This is why "checking your subtraction by adding back" always works — you are using the inverse.

## Properties worth naming

- **Commutative:** $a + b = b + a$. Order does not matter for addition (it *does* for subtraction: $7 - 3 \\neq 3 - 7$).
- **Associative:** $(a + b) + c = a + (b + c)$. Grouping does not matter.
- **Identity:** $a + 0 = a$. Adding zero changes nothing.

## A real example

A cashier making change is doing subtraction by *counting up* — using the inverse. For a 7-dollar item paid with a 20, instead of computing $20 - 7$ directly, they count $7 \\to 10 \\to 20$, handing over $3$ then $10$, which is $13$ in change. They found $20 - 7 = 13$ by solving $7 + \\square = 20$. The inverse relationship turns a hard subtraction into an easy addition.`,
  },
  {
    slug: "multiplication-division",
    title: "Multiplication and division",
    weekNumber: 1,
    blurb: "Repeated addition, sharing, and their inverse link.",
    lectureTitle: "1.3 Multiplication and division",
    body: `# Multiplication and division

**Multiplication** is repeated addition of equal groups; **division** splits a total into equal groups. Like addition and subtraction, they are **inverse** operations.

## Multiplication as equal groups

$7 \\times 6$ means "seven groups of six":

$$7 \\times 6 = 6 + 6 + 6 + 6 + 6 + 6 + 6 = 42.$$

It also counts a rectangle of dots $7$ rows by $6$ columns — which is why $7 \\times 6 = 6 \\times 7$. Multiplication is **commutative**.

## Division as the inverse

$$\\text{if } a \\times b = c, \\quad \\text{then } c \\div b = a \\ \\text{ and } \\ c \\div a = b.$$

So $7 \\times 6 = 42$ gives $42 \\div 6 = 7$ and $42 \\div 7 = 6$. Division asks "how many groups?" or "how big is each group?"

## Remainders and dividing by zero

Not every division comes out even: $17 \\div 5 = 3 \\text{ remainder } 2$, because $5 \\times 3 + 2 = 17$. And division by zero is **undefined**: $6 \\div 0$ would have to be a number that gives $6$ when multiplied by $0$, but everything times $0$ is $0$. There is no such number.

## Properties worth naming

- **Commutative:** $a \\times b = b \\times a$.
- **Associative:** $(a \\times b) \\times c = a \\times (b \\times c)$.
- **Identity:** $a \\times 1 = a$.
- **Distributive:** $a \\times (b + c) = a \\times b + a \\times c$ — the bridge between multiplication and addition.

## A real example

Tiling a floor is division in disguise. A wall $42$ inches wide takes $42 \\div 6 = 7$ tiles that are $6$ inches each — but only because $7 \\times 6 = 42$ comes out even. When it does not, the remainder is the gap you have to cut a tile to fill. Builders live in the world of "quotient and remainder."`,
  },
  {
    slug: "factors-multiples-primes",
    title: "Factors, multiples, and primes",
    weekNumber: 1,
    blurb: "The building blocks of whole numbers.",
    lectureTitle: "1.4 Factors, multiples, and primes",
    body: `# Factors, multiples, and primes

A **factor** of a number divides it evenly; a **multiple** is what you get by multiplying. $6$ is a factor of $24$ because $24 \\div 6 = 4$ with no remainder, and $24$ is a multiple of $6$.

## Primes: the atoms of arithmetic

A **prime number** has exactly two factors: $1$ and itself. The first few are $2, 3, 5, 7, 11, 13, \\ldots$ A number with more than two factors is **composite**. (Note $1$ is neither — it has only one factor.)

The **Fundamental Theorem of Arithmetic** says every whole number bigger than $1$ is a product of primes in exactly one way (apart from order). For example:

$$60 = 2 \\times 2 \\times 3 \\times 5 = 2^2 \\times 3 \\times 5.$$

This **prime factorization** is a number's fingerprint.

## GCF and LCM

From prime factorizations you read off two useful numbers:

- the **greatest common factor (GCF)** — the largest number dividing both, found from shared prime factors;
- the **least common multiple (LCM)** — the smallest number both divide into.

For $12 = 2^2 \\times 3$ and $18 = 2 \\times 3^2$: $\\gcd(12,18) = 2 \\times 3 = 6$ and $\\operatorname{lcm}(12,18) = 2^2 \\times 3^2 = 36$. We will need the LCM the moment we add fractions.

## A real example

Internet security rests on primes. The RSA system that protects online payments multiplies two enormous prime numbers — each hundreds of digits long — to make a public key. Anyone can multiply them; *nobody* can factor the product back apart in a reasonable time. The one-way difficulty of un-mixing a prime factorization is, quite literally, what keeps your credit-card number safe.`,
  },
  {
    slug: "negative-numbers-number-line",
    title: "Negative numbers and the number line",
    weekNumber: 1,
    blurb: "Extending counting below zero.",
    lectureTitle: "1.5 Negative numbers and the number line",
    body: `# Negative numbers and the number line

The whole numbers stop at $0$, but the world does not: temperatures drop below freezing, accounts go into debt, elevators go below ground. The **integers** extend the whole numbers in the other direction:

$$\\mathbb{Z} = \\{\\ldots, -3, -2, -1, 0, 1, 2, 3, \\ldots\\}.$$

## The number line

Draw a horizontal line, mark $0$, put the positives to the right and the negatives to the left, evenly spaced. Now every integer has a **place**. Bigger means farther right, so $-5 < -2$: negative five is *to the left of* negative two, hence smaller, even though "$5$" looks bigger than "$2$."

## Absolute value

The **absolute value** $|x|$ is the distance from $0$, ignoring direction:

$$|{-5}| = 5, \\qquad |5| = 5, \\qquad |0| = 0.$$

Distance is never negative.

## Signed arithmetic

- Adding a negative moves left: $3 + (-5) = -2$.
- Subtracting is adding the opposite: $4 - 7 = 4 + (-7) = -3$.
- Two negatives multiplied give a positive: $(-3)\\times(-4) = 12$; a negative times a positive is negative: $(-3)\\times 4 = -12$.

## A historical example

Negative numbers were distrusted for centuries — the Italian mathematician Cardano called them *numeri ficti*, "fictitious numbers," as late as $1545$. What finally made them ordinary was **bookkeeping**: a debt of seven coins behaves exactly like $-7$, and putting credits and debts in one signed column lets a merchant total the books in a single sweep. The number line gave the negatives a home, and accounting gave them a job.`,
  },
  {
    slug: "order-of-operations",
    title: "Order of operations",
    weekNumber: 1,
    blurb: "The agreed-upon order that makes expressions unambiguous.",
    lectureTitle: "1.6 Order of operations",
    body: `# Order of operations

What is $2 + 3 \\times 4$? If you add first you get $20$; if you multiply first you get $14$. To stop one expression from having two answers, mathematicians agreed on a fixed **order of operations**.

## The order

1. **Parentheses** (and other grouping symbols) first — innermost out.
2. **Exponents** next.
3. **Multiplication and division**, left to right.
4. **Addition and subtraction**, left to right.

A common memory aid is **PEMDAS**. The catch most students miss: multiplication and division share *one* step done left to right, and so do addition and subtraction. So $8 \\div 4 \\times 2 = 2 \\times 2 = 4$, not $8 \\div 8 = 1$.

## Worked examples

$$2 + 3 \\times 4 = 2 + 12 = 14.$$

$$2 + 3 \\times 4^2 = 2 + 3 \\times 16 = 2 + 48 = 50.$$

$$5 \\times (2 + 3)^2 = 5 \\times 5^2 = 5 \\times 25 = 125.$$

Parentheses override everything — they are how you *force* a different order.

## A real example

Spreadsheets and calculators bake this order in. Type \`=2+3*4\` into any spreadsheet and it returns $14$, not $20$, because the software follows the exact same convention. Programmers rely on it constantly — and when they need a different grouping, they add parentheses, just as you do on paper. The order of operations is not arbitrary fussiness; it is the shared grammar that lets a formula mean the same thing to every person and every machine that reads it.`,
  },
  {
    slug: "word-problems-strategies",
    title: "Word problems and problem-solving strategies",
    weekNumber: 1,
    blurb: "Turning a story into arithmetic you can do.",
    lectureTitle: "1.7 Word problems and problem-solving strategies",
    body: `# Word problems and problem-solving strategies

The hardest part of a word problem is usually not the arithmetic — it is deciding *which* arithmetic. A reliable strategy turns a paragraph into an expression you can evaluate.

## A four-step plan

1. **Understand.** What is being asked? What is the single quantity you want?
2. **Plan.** What is given, and which operation connects the givens to the answer? Watch for signal words: "total / altogether" suggests addition, "left / fewer" subtraction, "each / per / of" multiplication, "shared / split" division.
3. **Solve.** Write the expression and compute it, respecting the order of operations.
4. **Check.** Is the answer reasonable? Does it have the right units? Estimate to catch big mistakes.

## Worked example

*A shirt costs 18 dollars and you buy 3. How much do you spend?* "Each" and equal groups signal multiplication:

$$3 \\times 18 = 54 \\ \\text{dollars}.$$

Check by estimating: $3 \\times 20 = 60$, and $54$ is a little under that — reasonable.

## Translating into expressions

Often the win is writing the calculation, not just the number. *"You deposit 40 dollars and withdraw 55."* As signed numbers:

$$40 + (-55) = -15,$$

an account 15 dollars overdrawn. Naming the operation is half the battle.

## A real example

NASA lost the $\\$125$ million Mars Climate Orbiter in $1999$ because two teams skipped step 4. One used metric units (newtons), the other imperial (pound-force), and nobody checked that the numbers meant the same thing. The arithmetic was fine; the *setup* was wrong. Estimating and checking units is not busywork — it is the step that catches the errors that matter most.`,
  },
  // ───────────────────────────────────────────────────────────────
  // Unit 2 — Fractions, decimals, percents, and ratios
  // ───────────────────────────────────────────────────────────────
  {
    slug: "understanding-fractions",
    title: "Understanding fractions",
    weekNumber: 2,
    blurb: "Parts of a whole, and equivalent forms.",
    lectureTitle: "2.1 Understanding fractions",
    body: `# Understanding fractions

A **fraction** $\\dfrac{a}{b}$ describes a part of a whole. The bottom number, the **denominator** $b$, says how many equal pieces the whole is cut into; the top number, the **numerator** $a$, says how many of those pieces you have. In $\\dfrac{3}{4}$, the whole is cut into $4$ equal parts and you take $3$.

## Equivalent fractions

Cutting each piece into more pieces does not change the amount:

$$\\frac{3}{4} = \\frac{3 \\times 3}{4 \\times 3} = \\frac{9}{12}.$$

Multiplying numerator and denominator by the same nonzero number gives an **equivalent fraction**. Running it backwards is **simplifying** (reducing): divide both by their common factor.

$$\\frac{12}{18} = \\frac{12 \\div 6}{18 \\div 6} = \\frac{2}{3}.$$

A fraction is in **lowest terms** when numerator and denominator share no common factor but $1$.

## Types and comparison

- A **proper** fraction is less than $1$ (numerator smaller): $\\frac{3}{4}$.
- An **improper** fraction is $1$ or more: $\\frac{7}{4}$.
- A **mixed number** writes that as a whole part plus a fraction: $\\frac{7}{4} = 1\\frac{3}{4}$.

To compare fractions, give them a common denominator and compare numerators.

## A real example

Music is written in fractions. A whole note lasts a whole measure; a half note is $\\frac{1}{2}$ of it, a quarter note $\\frac{1}{4}$, an eighth note $\\frac{1}{8}$. A measure in $\\frac{4}{4}$ time is "full" exactly when the note values add to $1$ — for instance $\\frac{1}{4} + \\frac{1}{4} + \\frac{1}{2} = 1$. Every musician reading a score is checking that fractions add up to a whole.`,
  },
  {
    slug: "adding-subtracting-fractions",
    title: "Adding and subtracting fractions",
    weekNumber: 2,
    blurb: "Why you need a common denominator.",
    lectureTitle: "2.2 Adding and subtracting fractions",
    body: `# Adding and subtracting fractions

You can only add pieces that are the **same size**. That is the whole story behind the common-denominator rule.

## Same denominator: easy

When the denominators already match, just add (or subtract) the numerators and keep the denominator:

$$\\frac{2}{7} + \\frac{3}{7} = \\frac{5}{7}.$$

## Different denominators: find a common one

$\\frac{1}{2}$ and $\\frac{1}{3}$ are different-sized pieces, so first rewrite both with a common denominator — the **least common multiple** of $2$ and $3$, which is $6$:

$$\\frac{1}{2} = \\frac{3}{6}, \\qquad \\frac{1}{3} = \\frac{2}{6}, \\qquad \\frac{3}{6} + \\frac{2}{6} = \\frac{5}{6}.$$

Subtraction works the same way:

$$\\frac{3}{4} - \\frac{1}{6} = \\frac{9}{12} - \\frac{2}{12} = \\frac{7}{12}.$$

Always simplify the result to lowest terms.

## Mixed numbers

Add the whole parts and the fraction parts separately, or convert to improper fractions first:

$$2\\tfrac{1}{2} + 1\\tfrac{1}{3} = 2 + 1 + \\tfrac{3}{6} + \\tfrac{2}{6} = 3\\tfrac{5}{6}.$$

## A real example

A recipe says $\\frac{3}{4}$ cup of flour and you have already added $\\frac{1}{3}$ cup. How much is left to add? You cannot subtract until the pieces match: $\\frac{3}{4} - \\frac{1}{3} = \\frac{9}{12} - \\frac{4}{12} = \\frac{5}{12}$ cup. Cooks who "eyeball it" are estimating this subtraction; bakers, where ratios are unforgiving, actually compute it.`,
  },
  {
    slug: "multiplying-dividing-fractions",
    title: "Multiplying and dividing fractions",
    weekNumber: 2,
    blurb: "Multiply across; divide by flipping.",
    lectureTitle: "2.3 Multiplying and dividing fractions",
    body: `# Multiplying and dividing fractions

Multiplying and dividing fractions is, surprisingly, *easier* than adding them — no common denominator needed.

## Multiplication: straight across

Multiply numerators together and denominators together:

$$\\frac{2}{3} \\times \\frac{4}{5} = \\frac{2 \\times 4}{3 \\times 5} = \\frac{8}{15}.$$

It helps to cancel common factors first:

$$\\frac{3}{4} \\times \\frac{2}{9} = \\frac{3 \\times 2}{4 \\times 9} = \\frac{6}{36} = \\frac{1}{6}.$$

"$\\frac{2}{3}$ of $\\frac{4}{5}$" means exactly $\\frac{2}{3} \\times \\frac{4}{5}$ — the word **of** signals multiplication.

## The reciprocal

The **reciprocal** of a fraction flips it: the reciprocal of $\\frac{4}{5}$ is $\\frac{5}{4}$. A number times its reciprocal is $1$: $\\frac{4}{5} \\times \\frac{5}{4} = 1$.

## Division: multiply by the reciprocal

To divide, flip the second fraction and multiply:

$$\\frac{2}{3} \\div \\frac{4}{5} = \\frac{2}{3} \\times \\frac{5}{4} = \\frac{10}{12} = \\frac{5}{6}.$$

This works because dividing by $\\frac{4}{5}$ asks "how many $\\frac{4}{5}$-sized pieces fit?" — and that is the same as scaling up by its reciprocal.

## A real example

A $\\frac{3}{4}$-meter ribbon is cut into pieces $\\frac{1}{8}$ meter long. How many pieces? This is division: $\\frac{3}{4} \\div \\frac{1}{8} = \\frac{3}{4} \\times \\frac{8}{1} = \\frac{24}{4} = 6$ pieces. Dividing by a fraction smaller than $1$ gives *more* pieces — which is exactly why "divide by a half" feels backwards until you see it as "how many halves fit."`,
  },
  {
    slug: "decimals-place-value",
    title: "Decimals and place value",
    weekNumber: 2,
    blurb: "Place value continued to the right of the point.",
    lectureTitle: "2.4 Decimals and place value",
    body: `# Decimals and place value

A **decimal** extends place value past the ones place. Just as each place to the left is ten times bigger, each place to the right of the decimal point is ten times *smaller*.

## The places after the point

In $3.142$:

- $1$ is in the **tenths** place ($\\frac{1}{10}$),
- $4$ is in the **hundredths** place ($\\frac{4}{100}$),
- $2$ is in the **thousandths** place ($\\frac{2}{1000}$).

So a decimal is just a fraction with a power-of-ten denominator:

$$0.07 = \\frac{7}{100}, \\qquad 0.25 = \\frac{25}{100} = \\frac{1}{4}.$$

## Comparing and rounding

Compare decimals place by place from the left, lining up the points: $0.4 > 0.39$ because $4$ tenths beats $3$ tenths. To **round** to a place, look at the next digit: $5$ or more rounds up. So $3.142$ rounds to $3.14$ (to hundredths).

## Arithmetic

- **Add/subtract:** line up the decimal points, then add column by column.
- **Multiply:** multiply as whole numbers, then place the point so the answer has as many decimal places as the two factors combined: $0.2 \\times 0.3 = 0.06$.
- **Divide:** move both points right until the divisor is a whole number, then divide.

## A real example

Money is decimals to the hundredths — dollars and cents. A price of $\\$1.99$ is $1$ dollar and $\\frac{99}{100}$ of a dollar. Stores price things at $.99$ because of how we read place value left to right: $\\$1.99$ registers as "one-something," not "two." That marketing trick works *because* place value tells us the leading digit matters most.`,
  },
  {
    slug: "converting-fractions-decimals-percents",
    title: "Converting fractions, decimals, and percents",
    weekNumber: 2,
    blurb: "Three notations for the same number.",
    lectureTitle: "2.5 Converting fractions, decimals, and percents",
    body: `# Converting fractions, decimals, and percents

Fractions, decimals, and percents are three ways of writing the same idea: a part of a whole. Being able to switch between them fluently is one of the most useful skills in everyday math.

## Percent means "per hundred"

A **percent** is a fraction with denominator $100$: $\\;7\\% = \\dfrac{7}{100} = 0.07$.

## The conversion rules

- **Fraction → decimal:** divide top by bottom. $\\frac{3}{5} = 3 \\div 5 = 0.6$.
- **Decimal → percent:** multiply by $100$ (move the point two places right). $0.6 = 60\\%$.
- **Percent → decimal:** divide by $100$ (move the point two places left). $60\\% = 0.6$.
- **Decimal → fraction:** read the place value, then simplify. $0.6 = \\frac{6}{10} = \\frac{3}{5}$.

Put together: $\\;\\dfrac{3}{5} = 0.6 = 60\\%$. Same number, three costumes.

## Some worth memorizing

$$\\tfrac{1}{2} = 0.5 = 50\\%, \\quad \\tfrac{1}{4} = 0.25 = 25\\%, \\quad \\tfrac{3}{4} = 0.75 = 75\\%, \\quad \\tfrac{1}{3} = 0.\\overline{3} \\approx 33.3\\%.$$

## A real example

A "$25\\%$ off" sign, a coupon for "$\\frac{1}{4}$ off," and a discount of "$0.25$ times the price" are *identical* deals — they just speak three dialects. Shoppers who can convert on the fly spot that instantly and compare offers ("$\\frac{1}{3}$ off" vs. "$30\\%$ off") without reaching for a calculator. Fluency between the forms is real-world arithmetic power.`,
  },
  {
    slug: "ratios-rates-proportions",
    title: "Ratios, rates, and proportions",
    weekNumber: 2,
    blurb: "Comparing quantities and scaling them up.",
    lectureTitle: "2.6 Ratios, rates, and proportions",
    body: `# Ratios, rates, and proportions

A **ratio** compares two quantities. A **rate** is a ratio of quantities with different units. A **proportion** sets two ratios equal — and solving proportions is one of the most widely used techniques in all of applied math.

## Ratios

The ratio of $12$ to $18$ can be written $12 : 18$ or $\\frac{12}{18}$, and like any fraction it simplifies: $\\frac{12}{18} = \\frac{2}{3}$, i.e. $2 : 3$.

## Rates and unit rates

A **rate** pairs different units: $120$ miles in $2$ hours. A **unit rate** scales it to "per one":

$$\\frac{120 \\text{ mi}}{2 \\text{ hr}} = 60 \\text{ mi/hr}.$$

Unit rates ($60$ mph, $\\$3.50$ per pound, $25$ miles per gallon) are what make different offers comparable.

## Proportions and cross-multiplication

A **proportion** is an equation of two ratios. To solve for an unknown, **cross-multiply**:

$$\\frac{3}{4} = \\frac{x}{20} \\;\\Rightarrow\\; 4x = 3 \\times 20 = 60 \\;\\Rightarrow\\; x = 15.$$

## A real example

Maps run entirely on proportions. A scale of "$1$ inch $= 50$ miles" means every map distance and real distance form the same ratio. If two cities are $3.5$ inches apart, solve $\\frac{1}{50} = \\frac{3.5}{x}$ to get $x = 175$ miles. The same setup scales recipes, mixes paint, converts currency, and dilutes medicine — proportional reasoning is arithmetic's workhorse.`,
  },
  // ───────────────────────────────────────────────────────────────
  // Unit 3 — Percents, measurement, and beginning algebra
  // ───────────────────────────────────────────────────────────────
  {
    slug: "percent-problems-applications",
    title: "Percent problems and applications",
    weekNumber: 3,
    blurb: "Tips, tax, discounts, and percent change.",
    lectureTitle: "3.1 Percent problems and applications",
    body: `# Percent problems and applications

Most everyday math involving percents is a variation on one sentence: **"a percent *of* a base is an amount."** Translate the words and the arithmetic falls out.

## The basic three

"Of" means multiply; turn the percent into a decimal first.

$$\\text{What is } 15\\% \\text{ of } 80? \\quad 0.15 \\times 80 = 12.$$

The same equation, $\\text{amount} = \\text{rate} \\times \\text{base}$, solves all three classic questions — find the amount, find the rate, or find the base — depending on which piece is missing.

## Discounts, tax, and tip

These add or subtract a percent of the base:

- **Discount:** a 50-dollar jacket at $20\\%$ off costs $50 - 0.20 \\times 50 = 50 - 10 = 40$ dollars. (Shortcut: you pay $80\\%$, so $0.80 \\times 50 = 40$.)
- **Tax / tip:** a 40-dollar meal with a $20\\%$ tip costs $40 + 0.20 \\times 40 = 48$ dollars (or $1.20 \\times 40$).

## Percent change

To measure growth or shrinkage:

$$\\text{percent change} = \\frac{\\text{new} - \\text{old}}{\\text{old}} \\times 100\\%.$$

A price rising from $40$ to $50$ is $\\frac{50-40}{40}\\times 100\\% = 25\\%$ growth.

## A real example

Compound interest is percent change applied over and over. Put $1000$ dollars in an account paying $5\\%$ a year and after one year you have $1.05 \\times 1000 = 1050$; after two, $1.05 \\times 1050 = 1102.50$. Because each year's percent is taken of a *bigger* base, savings — and credit-card debt — grow faster than people expect. Every interest rate you ever meet is this one percent idea, iterated.`,
  },
  {
    slug: "units-measurement-conversion",
    title: "Units, measurement, and conversion",
    weekNumber: 3,
    blurb: "Carrying units through a calculation correctly.",
    lectureTitle: "3.2 Units, measurement, and conversion",
    body: `# Units, measurement, and conversion

A measurement is a number *with a unit*: $5$ meters, $3$ pounds, $90$ minutes. The number alone is meaningless — "$5$" of what? Converting between units cleanly is a skill that prevents expensive mistakes.

## The metric system

The metric system is built on powers of ten, so converting is just moving a decimal point:

$$1 \\text{ km} = 1000 \\text{ m}, \\qquad 1 \\text{ m} = 100 \\text{ cm}, \\qquad 1 \\text{ kg} = 1000 \\text{ g}.$$

So $2.5$ km $= 2.5 \\times 1000 = 2500$ m.

## Converting with conversion factors

A **conversion factor** is a fraction equal to $1$, like $\\dfrac{60 \\text{ min}}{1 \\text{ hr}}$. Multiplying by it changes the units but not the amount, and the old units **cancel**:

$$3 \\text{ hr} \\times \\frac{60 \\text{ min}}{1 \\text{ hr}} = 180 \\text{ min}.$$

Watching units cancel ("dimensional analysis") tells you whether you multiplied or divided correctly — if the leftover unit is wrong, the setup is wrong.

## Area and volume scale differently

Units square and cube: $1 \\text{ m} = 100 \\text{ cm}$, but $1 \\text{ m}^2 = 100^2 = 10000 \\text{ cm}^2$, and $1 \\text{ m}^3 = 100^3 = 1{,}000{,}000 \\text{ cm}^3$.

## A real example

In $1983$, Air Canada Flight 143 ran out of fuel mid-flight because the ground crew loaded it in **pounds** instead of **kilograms** — a unit slip that left the plane with less than half the fuel it needed. The pilots glided it to a safe landing, but the lesson stuck: keep units attached to every number, and let them cancel, so the calculation tells you when it has gone wrong.`,
  },
  {
    slug: "variables-expressions-intro",
    title: "Introduction to variables and expressions",
    weekNumber: 3,
    blurb: "Letters that stand for numbers.",
    lectureTitle: "3.3 Introduction to variables and expressions",
    body: `# Introduction to variables and expressions

Algebra begins when we let a **letter stand for a number we do not yet know** — a **variable**. An **expression** is a combination of numbers, variables, and operations, like $2n + 5$, that names a quantity without (yet) asserting anything about it.

## Reading the notation

Two shorthand conventions trip people up at first:

- A number next to a variable means multiply: $2n$ means $2 \\times n$. The number is the **coefficient**.
- A repeated factor uses an exponent: $n \\times n = n^2$.

So $2n + 5$ says "double the number, then add five."

## Translating English into algebra

| English | Expression |
|---|---|
| five more than a number | $n + 5$ |
| twice a number | $2n$ |
| five more than twice a number | $2n + 5$ |
| a number decreased by $4$ | $n - 4$ |
| half of a number | $\\dfrac{n}{2}$ |

## Terms

An expression is built from **terms** separated by $+$ or $-$. In $2n + 5$, the terms are $2n$ and $5$. A plain number like $5$ is a **constant** term. Terms with the *same* variable part are **like terms** — the key to simplifying, which is next.

## A real example

Every spreadsheet formula is an algebraic expression. When you write \`=2*A1+5\`, the cell \`A1\` is a variable: the formula computes $2n + 5$ for whatever number $n$ currently lives in \`A1\`, and updates the instant that number changes. Variables are what let one formula stand in for infinitely many specific calculations — the entire reason spreadsheets, and algebra, are powerful.`,
  },
  {
    slug: "simplifying-evaluating-expressions",
    title: "Simplifying and evaluating expressions",
    weekNumber: 3,
    blurb: "Combining like terms and plugging in values.",
    lectureTitle: "3.4 Simplifying and evaluating expressions",
    body: `# Simplifying and evaluating expressions

Two everyday jobs with expressions: **simplify** them (rewrite them shorter) and **evaluate** them (find their value for given numbers).

## Combining like terms

**Like terms** have the same variable part, so you can add their coefficients — it is just the distributive law in reverse:

$$3x + 5x = (3 + 5)x = 8x.$$

You cannot combine unlike terms: $3x + 2$ stays $3x + 2$. A fuller example:

$$3x + 2 + 5x - 4 = (3x + 5x) + (2 - 4) = 8x - 2.$$

## The distributive property

To remove parentheses, multiply the outside factor by every term inside:

$$3(x + 4) = 3x + 12, \\qquad 2(3x - 5) = 6x - 10.$$

This is the single most-used move in all of algebra.

## Evaluating

To **evaluate**, substitute a number for each variable and follow the order of operations:

$$\\text{at } x = 3: \\quad 8x - 2 = 8(3) - 2 = 24 - 2 = 22.$$

Simplifying first makes evaluating easier and less error-prone.

## A real example

A phone plan that charges 30 dollars a month plus 10 cents per gigabyte is the expression $30 + 0.10g$. Simplifying keeps it tidy; *evaluating* answers the real question — at $g = 20$ gigabytes the bill is $30 + 0.10(20) = 32$ dollars. One expression, evaluated at different $g$, prices every possible month. That is exactly how billing software works under the hood.`,
  },
  {
    slug: "one-step-equations",
    title: "Solving one-step equations",
    weekNumber: 3,
    blurb: "Undoing one operation to isolate the variable.",
    lectureTitle: "3.5 Solving one-step equations",
    body: `# Solving one-step equations

An **equation** says two expressions are equal: $x - 7 = 12$. To **solve** it is to find the value of the variable that makes the statement true. The whole method rests on one idea: **keep the equation balanced.**

## The balance principle

An equation is like a scale. Whatever you do to one side you must do to the other, or it tips:

$$\\text{if } a = b, \\text{ then } a + c = b + c, \\quad a - c = b - c, \\quad ac = bc, \\quad \\frac{a}{c} = \\frac{b}{c}\\ (c \\neq 0).$$

## Undo with the inverse

To isolate the variable, undo the operation attached to it using its **inverse** (from Unit 1):

- $x - 7 = 12$: undo "$-7$" by adding $7$. $\\;x = 19$.
- $x + 5 = 11$: subtract $5$. $\\;x = 6$.
- $3x = 12$: undo "$\\times 3$" by dividing by $3$. $\\;x = 4$.
- $\\dfrac{x}{4} = 5$: multiply by $4$. $\\;x = 20$.

## Always check

Substitute your answer back: for $x = 19$, $\\;19 - 7 = 12$. ✓ Checking is free insurance against sign slips.

## A real example

Solving for an unknown is how you "work backwards" from a result. You spent 19 dollars and have 12 left — how much did you start with? The story is $x - 7 \\ne$… rather, you started with $x$, spent some, and $x - 7 = 12$ gives $x = 19$. Any time you know the outcome and want the input, you are solving an equation by undoing operations.`,
  },
  {
    slug: "multi-step-equations",
    title: "Solving multi-step equations",
    weekNumber: 3,
    blurb: "Reversing the order of operations to solve.",
    lectureTitle: "3.6 Solving multi-step equations",
    body: `# Solving multi-step equations

Most equations take more than one move. The strategy: **simplify each side, then undo operations in reverse order** — the opposite of the order of operations.

## The general plan

1. Clear parentheses (distribute) and combine like terms on each side.
2. Get all variable terms on one side, all constants on the other.
3. Undo addition/subtraction first, then multiplication/division last.
4. Check.

## Worked examples

$$2x + 3 = 11 \\;\\Rightarrow\\; 2x = 8 \\;\\Rightarrow\\; x = 4.$$

(First subtract $3$ — the *last* thing done to $x$ — then divide by $2$.)

A variable on both sides:

$$5x - 4 = 2x + 11 \\;\\Rightarrow\\; 3x - 4 = 11 \\;\\Rightarrow\\; 3x = 15 \\;\\Rightarrow\\; x = 5.$$

With parentheses:

$$3(x + 2) = 18 \\;\\Rightarrow\\; 3x + 6 = 18 \\;\\Rightarrow\\; 3x = 12 \\;\\Rightarrow\\; x = 4.$$

## A real example

A taxi charges a 3-dollar flat fee plus 2 dollars per mile, and your fare was 11 dollars. How far did you go? The model is $2x + 3 = 11$, and solving gives $x = 4$ miles. Notice you *undo* the trip in reverse: strip off the flat fee first ($-3$), then divide out the per-mile rate. Reversing the order of operations is exactly reversing the story.`,
  },
  {
    slug: "translating-words-equations",
    title: "Translating words into equations",
    weekNumber: 3,
    blurb: "Turning a sentence into a solvable equation.",
    lectureTitle: "3.7 Translating words into equations",
    body: `# Translating words into equations

The bridge from a word problem to algebra is a single equation. The skill is translation: deciding what the variable stands for and how the sentence connects to it.

## Key words

| Words | Symbol |
|---|---|
| is, equals, results in | $=$ |
| sum, more than, increased by | $+$ |
| difference, less than, decreased by | $-$ |
| product, times, of | $\\times$ |
| quotient, per, divided by | $\\div$ |

Watch word order: "five **less than** a number" is $n - 5$, not $5 - n$.

## Worked translation

*"Three times a number, decreased by $4$, equals $11$."*

$$3n - 4 = 11.$$

Then solve as a multi-step equation: $3n = 15$, so $n = 5$.

## A four-step habit

1. Name the unknown with a variable ("let $n$ be the number").
2. Translate each phrase into symbols.
3. Solve the equation.
4. Answer the actual question, with units, and check it against the words.

## A real example

Algebra word problems are how engineers and budgeters turn goals into numbers. "We need revenue of 50,000 dollars; each unit sells for 25 dollars and we have 10,000 dollars in fixed costs — how many must we sell?" becomes $25n + 10000 = 50000$, giving $n = 1600$ units. The hard, valuable step is never the algebra — it is writing the equation that captures the situation.`,
  },
  // ───────────────────────────────────────────────────────────────
  // Unit 4 — Graphing, exponents, polynomials, and geometry
  // ───────────────────────────────────────────────────────────────
  {
    slug: "coordinate-plane",
    title: "The coordinate plane",
    weekNumber: 4,
    blurb: "Locating points with ordered pairs.",
    lectureTitle: "4.1 The coordinate plane",
    body: `# The coordinate plane

The **coordinate plane** is two number lines crossed at right angles: a horizontal **x-axis** and a vertical **y-axis**, meeting at the **origin** $(0,0)$. It turns the one-dimensional number line into a two-dimensional map.

## Ordered pairs

Every point has an address, an **ordered pair** $(x, y)$:

- the first number, $x$, says how far **right** (positive) or **left** (negative) of the origin,
- the second, $y$, says how far **up** (positive) or **down** (negative).

So the point $3$ right and $2$ down from the origin is $(3, -2)$. Order matters: $(3, 2)$ and $(2, 3)$ are different points.

## The four quadrants

The axes cut the plane into four **quadrants**, numbered counterclockwise from the top right:

$$\\text{I: } (+,+), \\quad \\text{II: } (-,+), \\quad \\text{III: } (-,-), \\quad \\text{IV: } (+,-).$$

A point on an axis (like $(5,0)$) belongs to no quadrant.

## A historical example

The idea is barely four centuries old. According to legend, René Descartes invented it around $1637$ while watching a fly walk across his ceiling and realizing he could pin down its position with two numbers — distance from two walls. Linking *geometry* (points, shapes) to *algebra* (pairs of numbers) was revolutionary: suddenly a line could be an equation and an equation could be a picture. We still call the plane "Cartesian" in his honor.`,
  },
  {
    slug: "graphing-linear-equations",
    title: "Graphing linear equations",
    weekNumber: 4,
    blurb: "Equations whose graphs are straight lines.",
    lectureTitle: "4.2 Graphing linear equations",
    body: `# Graphing linear equations

A **linear equation** in two variables, like $y = 2x + 1$, pairs each $x$ with a $y$. Plotting all those pairs $(x, y)$ traces a **straight line** — hence "linear."

## From equation to points

Pick values of $x$, compute $y$, and make a table:

| $x$ | $y = 2x + 1$ | point |
|---|---|---|
| $0$ | $1$ | $(0, 1)$ |
| $1$ | $3$ | $(1, 3)$ |
| $3$ | $7$ | $(3, 7)$ |

Plot the points and draw the line through them. Two points determine a line; a third is a check.

## A point is a solution

A point lies on the line exactly when its coordinates make the equation true. $(3, 7)$ is on $y = 2x + 1$ because $7 = 2(3) + 1$. Every point on the line is a solution; every solution is a point on the line. That is the deep link Descartes opened up: **the graph is the picture of the equation's solutions.**

## Special lines

- $y = 3$ is a **horizontal** line (every $y$ is $3$).
- $x = 3$ is a **vertical** line (every $x$ is $3$).

## A real example

A phone plan of 30 dollars plus 2 dollars per gigabyte graphs as $y = 2x + 30$ — a straight line starting at $(0, 30)$ and climbing $2$ for each step right. Reading the graph, you can *see* the cost of any usage at a glance, and compare two plans by where their lines cross. Linear graphs make relationships visible.`,
  },
  {
    slug: "slope-intercepts",
    title: "Slope and intercepts",
    weekNumber: 4,
    blurb: "Steepness and where a line crosses the axes.",
    lectureTitle: "4.3 Slope and intercepts",
    body: `# Slope and intercepts

Two numbers capture everything about a line: its **slope** (how steep) and its **intercepts** (where it crosses the axes).

## Slope: rise over run

The **slope** $m$ measures steepness — the change in $y$ for each step in $x$:

$$m = \\frac{\\text{rise}}{\\text{run}} = \\frac{y_2 - y_1}{x_2 - x_1}.$$

Through $(1, 2)$ and $(4, 8)$:

$$m = \\frac{8 - 2}{4 - 1} = \\frac{6}{3} = 2.$$

Positive slope rises left-to-right; negative slope falls; zero slope is flat; a vertical line has *undefined* slope.

## Intercepts

- The **y-intercept** is where the line crosses the y-axis (where $x = 0$).
- The **x-intercept** is where it crosses the x-axis (where $y = 0$).

## Slope-intercept form

The tidiest way to write a line is

$$y = mx + b,$$

where $m$ is the slope and $b$ is the y-intercept. From $y = 2x + 1$ you can read off, with no work, slope $2$ and y-intercept $(0, 1)$ — then graph it instantly.

## A real example

Slope is "rate of change" everywhere. On a distance-vs-time graph the slope is **speed**; on a cost-vs-quantity graph it is **price per item**; on a wheelchair ramp it is literally the steepness building codes regulate (no steeper than $\\frac{1}{12}$). Whenever someone says "per" — miles per hour, dollars per pound — they are naming a slope.`,
  },
  {
    slug: "exponents-powers",
    title: "Exponents and powers",
    weekNumber: 4,
    blurb: "Repeated multiplication and its rules.",
    lectureTitle: "4.4 Exponents and powers",
    body: `# Exponents and powers

An **exponent** is shorthand for repeated multiplication. In $x^4$, the **base** $x$ is multiplied by itself, and the **exponent** $4$ counts the factors:

$$x^4 = x \\times x \\times x \\times x.$$

## The rules of exponents

Each rule comes straight from counting factors:

- **Product rule:** $x^a \\times x^b = x^{a+b}$. ($x^3 \\times x^4 = x^7$.)
- **Quotient rule:** $\\dfrac{x^a}{x^b} = x^{a-b}$. ($x^5 \\div x^2 = x^3$.)
- **Power rule:** $(x^a)^b = x^{ab}$. ($(x^2)^3 = x^6$.)
- **Zero exponent:** $x^0 = 1$ (for $x \\neq 0$).

A numeric check: $2^3 \\times 2^2 = 8 \\times 4 = 32 = 2^5$. ✓

## Powers of ten and scientific notation

Powers of ten let us write huge or tiny numbers compactly. **Scientific notation** writes a number as a digit-times-a-power-of-ten:

$$3{,}000{,}000 = 3 \\times 10^6, \\qquad 0.0004 = 4 \\times 10^{-4}.$$

## A real example

Exponential growth is exponents in time. A rumor told to $2$ people who each tell $2$ more, every round, reaches $2^n$ people after $n$ rounds — just $30$ rounds tops a billion. The same math drives compound interest, population growth, and how a virus spreads. Humans badly underestimate exponents, which is exactly why $2^{30}$ feels impossible until you multiply it out.`,
  },
  {
    slug: "intro-polynomials",
    title: "Introduction to polynomials",
    weekNumber: 4,
    blurb: "Adding, subtracting, and multiplying expressions with powers.",
    lectureTitle: "4.5 Introduction to polynomials",
    body: `# Introduction to polynomials

A **polynomial** is a sum of terms, each a number times a power of a variable — like $2x^2 + 3x - 5$. They are the expressions algebra is built from, and working with them just extends "combining like terms" to terms with exponents.

## Vocabulary

- Each piece ($2x^2$, $3x$, $-5$) is a **term**; the number in front is the **coefficient**.
- The **degree** is the highest exponent. $2x^2 + 3x - 5$ has degree $2$ (a **quadratic**); degree $1$ is **linear**.
- One term is a **monomial**, two a **binomial**, three a **trinomial**.

## Adding and subtracting

Combine **like terms** — terms with the same variable *and* exponent:

$$(2x^2 + 3x) + (x^2 - 5x) = 3x^2 - 2x.$$

For subtraction, distribute the minus sign first:

$$(4x^2 + 2x) - (x^2 - 3x) = 4x^2 + 2x - x^2 + 3x = 3x^2 + 5x.$$

## Multiplying

Use the distributive property. A monomial times a binomial:

$$2x(3x + 4) = 6x^2 + 8x.$$

Two binomials — multiply every term by every term (the "FOIL" pattern):

$$(x + 2)(x + 3) = x^2 + 3x + 2x + 6 = x^2 + 5x + 6.$$

## A real example

Polynomials model curved relationships that lines cannot. The height of a thrown ball is a quadratic in time, $h = -5t^2 + 20t + 1$; a company's profit often curves with price. Engineers and economists fit polynomials to data precisely because adding one squared term lets a straight-line model bend to match reality.`,
  },
  {
    slug: "geometry-perimeter-area-volume",
    title: "Basic geometry: perimeter, area, volume",
    weekNumber: 4,
    blurb: "Measuring length, surface, and space.",
    lectureTitle: "4.6 Basic geometry: perimeter, area, volume",
    body: `# Basic geometry: perimeter, area, volume

Three measurements describe a shape: **perimeter** (distance around it), **area** (surface it covers), and **volume** (space it fills). They differ not just in formula but in *dimension*.

## Perimeter (1-D, measured in units)

Add up the sides. For a rectangle of length $l$ and width $w$:

$$P = 2l + 2w.$$

For a circle the perimeter is the **circumference**: $C = 2\\pi r$.

## Area (2-D, measured in square units)

- Rectangle: $A = l \\times w$. (An $8$-by-$5$ rectangle has area $8 \\times 5 = 40$.)
- Triangle: $A = \\tfrac{1}{2} b h$.
- Circle: $A = \\pi r^2$.

Area is always in **square** units (cm$^2$, ft$^2$) because you are tiling with unit squares.

## Volume (3-D, measured in cubic units)

- Rectangular box: $V = l \\times w \\times h$.
- Cylinder: $V = \\pi r^2 h$.

Volume is in **cubic** units — you are filling with unit cubes.

## A real example

The dimension is why a large pizza is a far better deal than a small one. Doubling a pizza's radius does not double the food — area grows with $r^2$, so a $16$-inch pizza has *four times* the area of an $8$-inch one, rarely for four times the price. Understanding that length, area, and volume scale by different powers turns geometry into everyday savings.`,
  },
  {
    slug: "reading-tables-charts-graphs",
    title: "Reading tables, charts, and graphs",
    weekNumber: 4,
    blurb: "Pulling numbers and summaries out of data.",
    lectureTitle: "4.7 Reading tables, charts, and graphs",
    body: `# Reading tables, charts, and graphs

Data arrives as tables and pictures, and reading them — pulling out values, spotting trends, and computing simple summaries — is one of the most practical math skills there is.

## Kinds of displays

- **Tables** list exact values in rows and columns.
- **Bar charts** compare amounts across categories.
- **Line graphs** show change over time (slope again: rising means growing).
- **Pie charts** show parts of a whole, as percents that sum to $100\\%$.

Always read the **labels, axes, and units** first — a chart with no scale can say anything.

## Simple summaries

For a list of numbers, three averages describe the "center":

$$\\text{mean} = \\frac{\\text{sum of values}}{\\text{how many}}, \\quad \\text{median} = \\text{middle value}, \\quad \\text{mode} = \\text{most frequent}.$$

For sales of $20$, $30$, and $40$:

$$\\text{mean} = \\frac{20 + 30 + 40}{3} = \\frac{90}{3} = 30.$$

## A real example

A misleading chart usually attacks one of these basics. A news graphic might start its y-axis at $90$ instead of $0$ to make a tiny rise look like a cliff, or quote the **mean** income of a town where one billionaire drags it far above what a **typical** family earns (the median). Reading data critically — checking the axis, asking *which* average — is numeric literacy in the real world.`,
  },
  {
    slug: "capstone-synthesis",
    title: "Capstone synthesis",
    weekNumber: 4,
    blurb: "Putting the whole course together on real problems.",
    lectureTitle: "4.8 Capstone synthesis",
    body: `# Capstone synthesis

You now hold a connected toolkit, not a pile of tricks. This final lecture shows how the pieces — whole-number operations, fractions, percents, proportions, and algebra — combine to solve the layered problems real life actually asks.

## The threads, tied together

- **Operations and place value** (Week 1) are the foundation everything else stands on.
- **Fractions, decimals, percents** (Week 2) are one idea — a part of a whole — in three notations.
- **Proportions and percents** (Weeks 2–3) scale and compare; they power discounts, rates, and conversions.
- **Variables and equations** (Week 3) let you solve for an unknown instead of guessing.
- **Graphs, exponents, and geometry** (Week 4) make relationships visible and measure the world.

## A worked synthesis

*A recipe for $4$ servings uses $3$ cups of flour. You are cooking for $10$. How much flour?* Set up a **proportion** and solve:

$$\\frac{3}{4} = \\frac{x}{10} \\;\\Rightarrow\\; 4x = 30 \\;\\Rightarrow\\; x = 7.5 \\text{ cups}.$$

Now layer on a percent: *flour is on sale at $20\\%$ off $\\$5$ for a $5$-cup bag.* You need $2$ bags ($10$ cups $\\ge 7.5$), each costing $0.80 \\times 5 = 4$ dollars, so $2 \\times 4 = 8$ dollars. One everyday question, four tools.

## The arc

We began by writing numbers with place value and end by chaining proportions, percents, and equations into a single answer. That is the real goal of developmental math: not isolated procedures, but the confidence to break any word problem into steps you know how to take.`,
  },
];

type SeedAssignment = {
  kind: "homework" | "test" | "midterm" | "final";
  title: string;
  weekNumber: number;
  isTimed: boolean;
  timeLimitMinutes: number | null;
  instructions: string;
  problems: Array<{
    topicSlug: string;
    prompt: string;
    correctAnswer: string;
    explanation: string;
    hint?: string;
  }>;
};

const ASSIGNMENTS: SeedAssignment[] = [
  // ───────────── Unit 1 ─────────────
  {
    kind: "homework",
    title: "Homework 1.1 — Whole numbers and operations",
    weekNumber: 1,
    isTimed: false,
    timeLimitMinutes: null,
    instructions:
      "Short-answer problems on place value and the four operations. Use the math keyboard for ×, ÷, exponents, and any symbols.",
    problems: [
      {
        topicSlug: "whole-numbers-place-value",
        prompt:
          "Write the number four thousand seven (4007) in expanded form using powers of ten (use × and exponents).",
        correctAnswer: "4007 = 4×10³ + 0×10² + 0×10¹ + 7×10⁰",
        explanation:
          "$4007 = 4\\times 1000 + 0\\times 100 + 0\\times 10 + 7\\times 1 = 4\\times 10^3 + 7\\times 10^0$. Each place is a power of ten.",
      },
      {
        topicSlug: "addition-subtraction",
        prompt:
          "Given the addition fact 8 + 5 = 13, write the two subtraction facts that undo it (use −).",
        correctAnswer: "13 − 5 = 8 and 13 − 8 = 5",
        explanation:
          "Subtraction is the inverse of addition: if $8+5=13$ then $13-5=8$ and $13-8=5$.",
      },
      {
        topicSlug: "multiplication-division",
        prompt:
          "Write 7 × 6 as repeated addition, and write the matching division fact (use × and ÷).",
        correctAnswer: "7 × 6 = 6+6+6+6+6+6+6 = 42; 42 ÷ 6 = 7",
        explanation:
          "$7\\times 6$ is seven sixes, $42$. Division undoes it: $42\\div 6 = 7$.",
      },
      {
        topicSlug: "factors-multiples-primes",
        prompt:
          "Write the prime factorization of 60 using exponents (use × and exponents).",
        correctAnswer: "60 = 2² × 3 × 5",
        explanation:
          "$60 = 2\\times 2\\times 3\\times 5 = 2^2\\times 3\\times 5$ — its unique prime fingerprint.",
      },
    ],
  },
  {
    kind: "homework",
    title: "Homework 1.2 — Integers, order of operations, problem solving",
    weekNumber: 1,
    isTimed: false,
    timeLimitMinutes: null,
    instructions:
      "Use the math keyboard for −, <, >, |x|, exponents, and parentheses.",
    problems: [
      {
        topicSlug: "negative-numbers-number-line",
        prompt:
          "Write an inequality comparing −5 and −2, and give the absolute value of −5 (use <, >, and |x|).",
        correctAnswer: "−5 < −2; |−5| = 5",
        explanation:
          "$-5$ is farther left on the number line, so $-5 < -2$. Absolute value is distance from zero: $|-5| = 5$.",
      },
      {
        topicSlug: "order-of-operations",
        prompt:
          "Using the order of operations, evaluate 2 + 3 × 4² and write the final value.",
        correctAnswer: "50",
        explanation:
          "Exponent first: $4^2 = 16$. Then multiply: $3\\times 16 = 48$. Then add: $2 + 48 = 50$.",
      },
      {
        topicSlug: "order-of-operations",
        prompt: "Evaluate 5 × (2 + 3)² and write the final value.",
        correctAnswer: "125",
        explanation:
          "Parentheses first: $2+3=5$. Then exponent: $5^2 = 25$. Then multiply: $5\\times 25 = 125$.",
      },
      {
        topicSlug: "word-problems-strategies",
        prompt:
          "You deposit 40 dollars and then withdraw 55 dollars. Write this as a signed-number addition and give the resulting balance (use − for the negative).",
        correctAnswer: "40 + (−55) = −15",
        explanation:
          "A withdrawal is negative: $40 + (-55) = -15$, an account 15 dollars overdrawn.",
      },
    ],
  },
  {
    kind: "test",
    title: "Week 1 Test — Whole numbers and operations",
    weekNumber: 1,
    isTimed: true,
    timeLimitMinutes: 30,
    instructions:
      "Timed test on Week 1. Use the math keyboard for ×, ÷, −, exponents, and |x|.",
    problems: [
      {
        topicSlug: "whole-numbers-place-value",
        prompt:
          "Use < or > to compare the whole numbers 4072 and 3999.",
        correctAnswer: "4072 > 3999",
        explanation:
          "Compare from the left: $4$ thousands beats $3$ thousands, so $4072 > 3999$.",
      },
      {
        topicSlug: "multiplication-division",
        prompt:
          "Write 17 ÷ 5 as a quotient with a remainder, and write the check using × and + (use ÷, ×, +).",
        correctAnswer: "17 ÷ 5 = 3 remainder 2; 5 × 3 + 2 = 17",
        explanation:
          "$5$ goes into $17$ three times with $2$ left over; check: $5\\times 3 + 2 = 17$.",
      },
      {
        topicSlug: "factors-multiples-primes",
        prompt:
          "For 12 and 18, write the greatest common factor and the least common multiple (use gcd and lcm).",
        correctAnswer: "gcd(12,18) = 6; lcm(12,18) = 36",
        explanation:
          "$12 = 2^2\\times 3$, $18 = 2\\times 3^2$. GCF uses shared factors $2\\times 3 = 6$; LCM uses the highest powers $2^2\\times 3^2 = 36$.",
      },
      {
        topicSlug: "negative-numbers-number-line",
        prompt: "Evaluate (−3) × (−4) and write the result (use × and −).",
        correctAnswer: "(−3) × (−4) = 12",
        explanation:
          "A negative times a negative is positive: $(-3)\\times(-4) = 12$.",
      },
      {
        topicSlug: "order-of-operations",
        prompt: "Evaluate 8 ÷ 4 × 2 (use ÷ and ×).",
        correctAnswer: "4",
        explanation:
          "Multiplication and division go left to right: $8\\div 4 = 2$, then $2\\times 2 = 4$.",
      },
    ],
  },
  // ───────────── Unit 2 ─────────────
  {
    kind: "homework",
    title: "Homework 2.1 — Understanding and operating with fractions",
    weekNumber: 2,
    isTimed: false,
    timeLimitMinutes: null,
    instructions:
      "Use the math keyboard for the fraction bar (/), ×, and ÷. Give every answer in lowest terms.",
    problems: [
      {
        topicSlug: "understanding-fractions",
        prompt:
          "Write the fraction equivalent to 3/4 that has denominator 12 (use the fraction bar /).",
        correctAnswer: "9/12",
        explanation:
          "Multiply top and bottom by $3$: $\\frac{3}{4} = \\frac{9}{12}$.",
      },
      {
        topicSlug: "adding-subtracting-fractions",
        prompt:
          "Compute 1/2 + 1/3 and write the result as a single fraction in lowest terms (use /).",
        correctAnswer: "5/6",
        explanation:
          "Common denominator $6$: $\\frac{3}{6} + \\frac{2}{6} = \\frac{5}{6}$.",
      },
      {
        topicSlug: "multiplying-dividing-fractions",
        prompt:
          "Compute 3/4 × 2/9 and write the result in lowest terms (use × and /).",
        correctAnswer: "1/6",
        explanation:
          "Multiply across: $\\frac{6}{36}$, which simplifies to $\\frac{1}{6}$.",
      },
      {
        topicSlug: "multiplying-dividing-fractions",
        prompt:
          "Compute 2/3 ÷ 4/5 and write the result in lowest terms (use ÷ and /).",
        correctAnswer: "5/6",
        explanation:
          "Multiply by the reciprocal: $\\frac{2}{3}\\times\\frac{5}{4} = \\frac{10}{12} = \\frac{5}{6}$.",
      },
    ],
  },
  {
    kind: "homework",
    title: "Homework 2.2 — Decimals, percents, ratios, and proportions",
    weekNumber: 2,
    isTimed: false,
    timeLimitMinutes: null,
    instructions:
      "Use the math keyboard for /, %, =, and the variable x.",
    problems: [
      {
        topicSlug: "decimals-place-value",
        prompt:
          "Write 0.07 as a fraction (in lowest terms) and as a percent (use / and %).",
        correctAnswer: "7/100 = 7%",
        explanation:
          "Two decimal places means hundredths: $0.07 = \\frac{7}{100} = 7\\%$.",
      },
      {
        topicSlug: "converting-fractions-decimals-percents",
        prompt:
          "Write 3/5 as a decimal and as a percent (use / and %).",
        correctAnswer: "3/5 = 0.6 = 60%",
        explanation:
          "$3\\div 5 = 0.6$, and $0.6 = 60\\%$.",
      },
      {
        topicSlug: "ratios-rates-proportions",
        prompt:
          "Write the ratio 12 to 18 in lowest terms (use / or the ratio symbol).",
        correctAnswer: "2/3",
        explanation:
          "Divide both by $6$: $\\frac{12}{18} = \\frac{2}{3}$ (that is $2:3$).",
      },
      {
        topicSlug: "ratios-rates-proportions",
        prompt:
          "Solve the proportion 3/4 = x/20 for x. Write the solution as an equation (use /, =, and x).",
        correctAnswer: "x = 15",
        explanation:
          "Cross-multiply: $4x = 60$, so $x = 15$.",
      },
    ],
  },
  {
    kind: "midterm",
    title: "Midterm — Weeks 1 & 2",
    weekNumber: 2,
    isTimed: true,
    timeLimitMinutes: 60,
    instructions:
      "Cumulative timed midterm over Weeks 1 and 2. Use the math keyboard for all symbols (×, ÷, /, %, exponents, =).",
    problems: [
      {
        topicSlug: "whole-numbers-place-value",
        prompt:
          "Write the number 3502 in expanded form using powers of ten (use × and exponents).",
        correctAnswer: "3502 = 3×10³ + 5×10² + 0×10¹ + 2×10⁰",
        explanation:
          "$3502 = 3\\times 1000 + 5\\times 100 + 0\\times 10 + 2\\times 1$.",
      },
      {
        topicSlug: "factors-multiples-primes",
        prompt:
          "Write the prime factorization of 48 using exponents (use × and exponents).",
        correctAnswer: "48 = 2⁴ × 3",
        explanation: "$48 = 2\\times 2\\times 2\\times 2\\times 3 = 2^4\\times 3$.",
      },
      {
        topicSlug: "order-of-operations",
        prompt: "Evaluate 3 + 2 × (5 − 1)² and write the final value.",
        correctAnswer: "35",
        explanation:
          "Parentheses: $5-1=4$. Exponent: $4^2=16$. Multiply: $2\\times 16 = 32$. Add: $3+32 = 35$.",
      },
      {
        topicSlug: "adding-subtracting-fractions",
        prompt:
          "Compute 3/4 − 1/6 in lowest terms (use / and −).",
        correctAnswer: "7/12",
        explanation:
          "Common denominator $12$: $\\frac{9}{12} - \\frac{2}{12} = \\frac{7}{12}$.",
      },
      {
        topicSlug: "converting-fractions-decimals-percents",
        prompt:
          "Write 1/4 as a decimal and as a percent (use / and %).",
        correctAnswer: "1/4 = 0.25 = 25%",
        explanation: "$1\\div 4 = 0.25 = 25\\%$.",
      },
      {
        topicSlug: "ratios-rates-proportions",
        prompt:
          "A car travels 120 miles in 2 hours. Write the unit rate in miles per hour (use / or 'mph').",
        correctAnswer: "60 mph",
        explanation:
          "$\\frac{120\\text{ mi}}{2\\text{ hr}} = 60$ miles per hour.",
      },
    ],
  },
  // ───────────── Unit 3 ─────────────
  {
    kind: "homework",
    title: "Homework 3.1 — Percents, measurement, and variables",
    weekNumber: 3,
    isTimed: false,
    timeLimitMinutes: null,
    instructions:
      "Use the math keyboard for ×, %, =, and variables.",
    problems: [
      {
        topicSlug: "percent-problems-applications",
        prompt:
          "What is 15% of 80? Write the computation as a product and give the result (use × and %).",
        correctAnswer: "0.15 × 80 = 12",
        explanation:
          "'Of' means multiply, and $15\\% = 0.15$: $0.15\\times 80 = 12$.",
      },
      {
        topicSlug: "percent-problems-applications",
        prompt:
          "A jacket costs 50 dollars and is marked 20% off. Write an expression for the sale price and evaluate it (use × and −).",
        correctAnswer: "50 − 0.20 × 50 = 40",
        explanation:
          "Discount is $0.20\\times 50 = 10$, so the price is $50 - 10 = 40$ dollars.",
      },
      {
        topicSlug: "units-measurement-conversion",
        prompt:
          "Convert 2.5 kilometers to meters. Write the conversion as a product and give the result (use ×).",
        correctAnswer: "2.5 × 1000 = 2500",
        explanation: "$1$ km $= 1000$ m, so $2.5\\times 1000 = 2500$ meters.",
      },
      {
        topicSlug: "variables-expressions-intro",
        prompt:
          "Write an algebraic expression for 'five more than twice a number n' (use the variable n).",
        correctAnswer: "2n + 5",
        explanation:
          "'Twice a number' is $2n$; 'five more than' adds $5$: $2n + 5$.",
      },
    ],
  },
  {
    kind: "homework",
    title: "Homework 3.2 — Expressions and equations",
    weekNumber: 3,
    isTimed: false,
    timeLimitMinutes: null,
    instructions:
      "Use the math keyboard for variables, =, +, −, and ×.",
    problems: [
      {
        topicSlug: "simplifying-evaluating-expressions",
        prompt:
          "Simplify 3x + 2 + 5x − 4 by combining like terms (use the variable x).",
        correctAnswer: "8x − 2",
        explanation:
          "$3x+5x = 8x$ and $2-4 = -2$, giving $8x - 2$.",
      },
      {
        topicSlug: "one-step-equations",
        prompt:
          "Solve the equation x − 7 = 12. Write the solution (use = and x).",
        correctAnswer: "x = 19",
        explanation:
          "Add $7$ to both sides: $x = 12 + 7 = 19$.",
      },
      {
        topicSlug: "multi-step-equations",
        prompt:
          "Solve the equation 2x + 3 = 11. Write the solution (use = and x).",
        correctAnswer: "x = 4",
        explanation:
          "Subtract $3$: $2x = 8$. Divide by $2$: $x = 4$.",
      },
      {
        topicSlug: "translating-words-equations",
        prompt:
          "Translate 'three times a number, decreased by 4, equals 11' into an equation (use the variable n and =).",
        correctAnswer: "3n − 4 = 11",
        explanation:
          "'Three times a number' is $3n$, 'decreased by 4' subtracts $4$, 'equals 11' is $= 11$.",
      },
    ],
  },
  {
    kind: "test",
    title: "Week 3 Test — Percents, measurement, and algebra",
    weekNumber: 3,
    isTimed: true,
    timeLimitMinutes: 40,
    instructions:
      "Timed test on Week 3. Use the math keyboard for %, ×, =, and variables.",
    problems: [
      {
        topicSlug: "percent-problems-applications",
        prompt:
          "A price rises from 40 to 50. Write the percent change as a computation and give the percent (use the percent-change formula and %).",
        correctAnswer: "(50 − 40)/40 × 100% = 25%",
        explanation:
          "Percent change $= \\frac{\\text{new}-\\text{old}}{\\text{old}}\\times 100\\% = \\frac{10}{40}\\times 100\\% = 25\\%$.",
      },
      {
        topicSlug: "simplifying-evaluating-expressions",
        prompt:
          "Use the distributive property to expand 3(x + 4) (use the variable x).",
        correctAnswer: "3x + 12",
        explanation:
          "Multiply $3$ by each term: $3\\times x + 3\\times 4 = 3x + 12$.",
      },
      {
        topicSlug: "simplifying-evaluating-expressions",
        prompt:
          "Evaluate 8x − 2 when x = 3 (substitute and give the value).",
        correctAnswer: "22",
        explanation: "$8(3) - 2 = 24 - 2 = 22$.",
      },
      {
        topicSlug: "multi-step-equations",
        prompt:
          "Solve 5x − 4 = 2x + 11. Write the solution (use = and x).",
        correctAnswer: "x = 5",
        explanation:
          "Subtract $2x$: $3x - 4 = 11$. Add $4$: $3x = 15$. Divide by $3$: $x = 5$.",
      },
      {
        topicSlug: "translating-words-equations",
        prompt:
          "A taxi charges a 3-dollar flat fee plus 2 dollars per mile for a total of 11 dollars. Write an equation for the miles x (use =, +, ×, and x).",
        correctAnswer: "2x + 3 = 11",
        explanation:
          "Per-mile cost $2x$ plus the flat fee $3$ equals the total $11$: $2x + 3 = 11$ (so $x = 4$).",
      },
    ],
  },
  // ───────────── Unit 4 ─────────────
  {
    kind: "homework",
    title: "Homework 4.1 — Coordinate plane, lines, and exponents",
    weekNumber: 4,
    isTimed: false,
    timeLimitMinutes: null,
    instructions:
      "Use the math keyboard for coordinates ( , ), −, /, =, and exponents.",
    problems: [
      {
        topicSlug: "coordinate-plane",
        prompt:
          "Write the coordinates of the point 3 units right and 2 units down from the origin (use an ordered pair with parentheses and −).",
        correctAnswer: "(3, −2)",
        explanation:
          "Right is positive $x$, down is negative $y$: $(3, -2)$, in quadrant IV.",
      },
      {
        topicSlug: "graphing-linear-equations",
        prompt:
          "For the line y = 2x + 1, write the y-value when x = 3 (use = and y).",
        correctAnswer: "y = 7",
        explanation: "$y = 2(3) + 1 = 7$, so the point $(3, 7)$ is on the line.",
      },
      {
        topicSlug: "slope-intercepts",
        prompt:
          "Find the slope of the line through (1, 2) and (4, 8) using the slope formula (use / and −).",
        correctAnswer: "m = (8 − 2)/(4 − 1) = 2",
        explanation:
          "$m = \\frac{y_2 - y_1}{x_2 - x_1} = \\frac{8-2}{4-1} = \\frac{6}{3} = 2$.",
      },
      {
        topicSlug: "exponents-powers",
        prompt:
          "Simplify x³ × x⁴ using the product rule (use the variable x and exponents).",
        correctAnswer: "x⁷",
        explanation:
          "Add the exponents: $x^3\\times x^4 = x^{3+4} = x^7$.",
      },
    ],
  },
  {
    kind: "homework",
    title: "Homework 4.2 — Polynomials, geometry, and data",
    weekNumber: 4,
    isTimed: false,
    timeLimitMinutes: null,
    instructions:
      "Use the math keyboard for variables, exponents, ×, +, −, /, and =.",
    problems: [
      {
        topicSlug: "intro-polynomials",
        prompt:
          "Add the polynomials (2x² + 3x) + (x² − 5x) and write the result (use the variable x and exponents).",
        correctAnswer: "3x² − 2x",
        explanation:
          "Combine like terms: $2x^2 + x^2 = 3x^2$ and $3x - 5x = -2x$.",
      },
      {
        topicSlug: "geometry-perimeter-area-volume",
        prompt:
          "Write the area of a rectangle with length 8 and width 5 as a product and give its value (use × and =).",
        correctAnswer: "A = 8 × 5 = 40",
        explanation:
          "Area of a rectangle is $l\\times w = 8\\times 5 = 40$ square units.",
      },
      {
        topicSlug: "reading-tables-charts-graphs",
        prompt:
          "A table shows sales of 20, 30, and 40. Write the mean as a computation and give its value (use / and =).",
        correctAnswer: "(20 + 30 + 40)/3 = 30",
        explanation:
          "Mean $= \\frac{20+30+40}{3} = \\frac{90}{3} = 30$.",
      },
      {
        topicSlug: "capstone-synthesis",
        prompt:
          "A recipe for 4 servings uses 3 cups of flour. Write a proportion for 10 servings and solve for x cups (use /, =, and x).",
        correctAnswer: "3/4 = x/10, x = 7.5",
        explanation:
          "Cross-multiply: $4x = 30$, so $x = 7.5$ cups.",
      },
    ],
  },
  {
    kind: "final",
    title: "Final Exam — Developmental mathematics",
    weekNumber: 4,
    isTimed: true,
    timeLimitMinutes: 90,
    instructions:
      "Cumulative timed final over all four weeks. Use the math keyboard for every symbol (×, ÷, /, %, exponents, =, coordinates, variables).",
    problems: [
      {
        topicSlug: "factors-multiples-primes",
        prompt:
          "Write the prime factorization of 72 using exponents (use × and exponents).",
        correctAnswer: "72 = 2³ × 3²",
        explanation: "$72 = 2\\times 2\\times 2\\times 3\\times 3 = 2^3\\times 3^2$.",
      },
      {
        topicSlug: "order-of-operations",
        prompt: "Evaluate 4 + 2 × 3² − 5 and write the final value.",
        correctAnswer: "17",
        explanation:
          "Exponent: $3^2 = 9$. Multiply: $2\\times 9 = 18$. Then $4 + 18 - 5 = 17$.",
      },
      {
        topicSlug: "multiplying-dividing-fractions",
        prompt:
          "Compute 3/4 ÷ 1/8 and write the result (use ÷ and /).",
        correctAnswer: "6",
        explanation:
          "Multiply by the reciprocal: $\\frac{3}{4}\\times\\frac{8}{1} = \\frac{24}{4} = 6$.",
      },
      {
        topicSlug: "percent-problems-applications",
        prompt:
          "What is 25% of 64? Write the computation as a product and give the result (use × and %).",
        correctAnswer: "0.25 × 64 = 16",
        explanation: "$25\\% = 0.25$, and $0.25\\times 64 = 16$.",
      },
      {
        topicSlug: "ratios-rates-proportions",
        prompt:
          "Solve the proportion 2/5 = x/30 for x (use /, =, and x).",
        correctAnswer: "x = 12",
        explanation: "Cross-multiply: $5x = 60$, so $x = 12$.",
      },
      {
        topicSlug: "multi-step-equations",
        prompt:
          "Solve the equation 3x + 5 = 20. Write the solution (use = and x).",
        correctAnswer: "x = 5",
        explanation: "Subtract $5$: $3x = 15$. Divide by $3$: $x = 5$.",
      },
      {
        topicSlug: "slope-intercepts",
        prompt:
          "For the line y = 3x − 2 written in slope-intercept form, write the slope and the y-intercept (use = and an ordered pair).",
        correctAnswer: "m = 3; y-intercept (0, −2)",
        explanation:
          "In $y = mx + b$, the slope is $m = 3$ and the y-intercept is $b = -2$, the point $(0,-2)$.",
      },
      {
        topicSlug: "intro-polynomials",
        prompt:
          "Multiply the binomials (x + 2)(x + 3) and write the result (use the variable x and exponents).",
        correctAnswer: "x² + 5x + 6",
        explanation:
          "$(x+2)(x+3) = x^2 + 3x + 2x + 6 = x^2 + 5x + 6$.",
      },
    ],
  },
];

// A stable fingerprint of the seed content. If the database holds topics that
// don't match this set, we wipe and re-seed instead of leaving stale content
// from a previous version of the course.
const EXPECTED_TOPIC_SLUGS = TOPICS.map((t) => t.slug).sort().join(",");

// Bump this whenever lecture bodies, assignment problems, or correct answers
// change in a way that should propagate to the database on the next boot.
// The value is stored alongside topics and compared in seedIfEmpty.
const CONTENT_REVISION = "2026-06-06.developmental-math.r1";

// A sentinel phrase present in exactly one lecture body — used to detect that
// the database holds the *current* revision of the content (not just a set of
// matching slugs). Bump whenever the seed content is overhauled.
const REVISION_SENTINEL_SLUG = "whole-numbers-place-value";
const REVISION_SENTINEL_PHRASE = "place value is the quiet engine";

export async function seedIfEmpty(): Promise<void> {
  const existing = await db.execute(sql`select count(*)::int as n from topics`);
  const row = (existing.rows[0] ?? {}) as { n?: number };
  const count = row.n ?? 0;

  if (count > 0) {
    const rows = await db.execute(sql`select slug from topics order by slug`);
    const actualSlugs = (rows.rows as Array<{ slug: string }>)
      .map((r) => r.slug)
      .sort()
      .join(",");
    const slugsMatch = actualSlugs === EXPECTED_TOPIC_SLUGS;
    let revisionMatches = false;
    try {
      const sentinelLec = await db.execute(
        sql`select l.body from lectures l join topics t on l.topic_id = t.id where t.slug = ${REVISION_SENTINEL_SLUG} limit 1`,
      );
      const body = ((sentinelLec.rows[0] ?? {}) as { body?: string }).body ?? "";
      revisionMatches = body.includes(REVISION_SENTINEL_PHRASE);
    } catch {
      revisionMatches = false;
    }
    if (slugsMatch && revisionMatches) {
      logger.info(
        { revision: CONTENT_REVISION },
        "Seed: already populated with current content, skipping",
      );
      return;
    }
    logger.info(
      { revision: CONTENT_REVISION, slugsMatch, revisionMatches },
      "Seed: course content drifted from expected revision — wiping and re-seeding",
    );
    // Order matters: child tables first.
    await db.execute(sql`delete from practice_attempts`);
    await db.execute(sql`delete from practice_problems`);
    await db.execute(sql`delete from practice_sessions`);
    await db.execute(sql`delete from answers`);
    await db.execute(sql`delete from attempts`);
    await db.execute(sql`delete from problems`);
    await db.execute(sql`delete from assignments`);
    await db.execute(sql`delete from lectures`);
    await db.execute(sql`delete from topics`);
  }

  logger.info("Seed: populating course content");

  // Topics + lectures
  const slugToTopicId = new Map<string, number>();
  for (let i = 0; i < TOPICS.length; i++) {
    const t = TOPICS[i]!;
    const [inserted] = await db
      .insert(topicsTable)
      .values({
        slug: t.slug,
        title: t.title,
        weekNumber: t.weekNumber,
        blurb: t.blurb,
        position: i,
      })
      .returning();
    if (!inserted) throw new Error(`Failed to insert topic ${t.slug}`);
    slugToTopicId.set(t.slug, inserted.id);
    await db.insert(lecturesTable).values({
      topicId: inserted.id,
      weekNumber: t.weekNumber,
      title: t.lectureTitle,
      body: t.body,
    });
  }

  // Assignments + problems
  for (let i = 0; i < ASSIGNMENTS.length; i++) {
    const a = ASSIGNMENTS[i]!;
    const [inserted] = await db
      .insert(assignmentsTable)
      .values({
        kind: a.kind,
        title: a.title,
        weekNumber: a.weekNumber,
        position: i,
        isTimed: a.isTimed,
        timeLimitMinutes: a.timeLimitMinutes,
        instructions: a.instructions,
      })
      .returning();
    if (!inserted) throw new Error(`Failed to insert assignment ${a.title}`);
    for (let p = 0; p < a.problems.length; p++) {
      const prob = a.problems[p]!;
      const topicId = slugToTopicId.get(prob.topicSlug);
      if (!topicId) throw new Error(`Unknown topic slug ${prob.topicSlug}`);
      await db.insert(problemsTable).values({
        assignmentId: inserted.id,
        topicId,
        position: p,
        prompt: prob.prompt,
        correctAnswer: prob.correctAnswer,
        explanation: prob.explanation,
        hint: prob.hint ?? null,
      });
    }
  }

  logger.info({ topics: TOPICS.length, assignments: ASSIGNMENTS.length }, "Seed complete");
}
