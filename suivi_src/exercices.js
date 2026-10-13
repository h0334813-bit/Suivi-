/* Exercices de TD : ch = indice de la séance (0 à 11), ans = réponse numérique attendue, tol = tolérance relative. */
const EX=[
{ch:0,unit:"%",ans:10,tol:.02,
 q:String.raw`Un portefeuille compte $n=2\,500$ contrats indépendants. Chaque contrat a un coût moyen de $300$ € et un écart-type de $1\,500$ €. Quel est le **coefficient de variation du coût moyen par contrat** (en %) ?`,
 sol:String.raw`L'écart-type du coût moyen vaut $\sigma/\sqrt n=1500/\sqrt{2500}=1500/50=30$ €.
Le coefficient de variation est donc $30/300=10\ \%$.

Sans mutualisation (un seul contrat), il serait de $1500/300=500\ \%$.`},
{ch:1,unit:"",ans:.417,tol:.02,
 q:String.raw`Un portefeuille présente une moyenne de $0{,}25$ et une variance de $0{,}40$ sinistres par contrat.
Après avoir retenu la binomiale négative, estimez son paramètre $r$ par la méthode des moments.`,
 sol:String.raw`Le rapport variance/moyenne vaut $1{,}6>1$ : il y a surdispersion, donc binomiale négative.

$$\hat r=\frac{m^2}{v-m}=\frac{0{,}0625}{0{,}15}\approx0{,}417,\qquad \hat p=\frac{m}{v}=0{,}625.$$`},
{ch:2,unit:"%",ans:3.125,tol:.01,
 q:String.raw`Les sinistres suivent une loi de Pareto d'indice $\alpha=2{,}5$ et de seuil $x_m=500$.
Quelle est la probabilité (en %) qu'un sinistre dépasse $2\,000$ € ?`,
 sol:String.raw`$$P(X>2000)=\Big(\frac{500}{2000}\Big)^{2{,}5}=0{,}25^{2{,}5}=0{,}0625\times0{,}5=0{,}03125.$$
Soit $3{,}125\ \%$.

Pour information, $E[X]=\alpha x_m/(\alpha-1)=833{,}3$ €.`},
{ch:3,unit:"",ans:3.53,tol:.01,
 q:String.raw`On observe trois sinistres : $1$, $10$ et $100$ (en k€), supposés log-normaux.
Calculez l'estimateur du maximum de vraisemblance $\hat\sigma^2$.`,
 sol:String.raw`Les logarithmes sont $0$ ; $2{,}3026$ ; $4{,}6052$, de moyenne $\hat\mu=2{,}3026$.

$$\hat\sigma^2=\frac13\big[(-2{,}3026)^2+0+2{,}3026^2\big]=\frac{10{,}604}{3}\approx3{,}53.$$
(Estimateur du maximum de vraisemblance : on divise par $n$, pas par $n-1$.)`},
{ch:4,unit:"",ans:6325,tol:.01,
 q:String.raw`$N\sim\text{Poisson}(50)$ et $X$ suit une loi Gamma de moyenne $800$ et d'écart-type $400$.
Calculez l'**écart-type** de la charge totale $S$.`,
 sol:String.raw`$E[S]=50\times800=40\,000$.

$E[X^2]=800^2+400^2=800\,000$, donc $\mathrm{Var}(S)=\lambda E[X^2]=50\times800\,000=4\cdot10^7$.

$\sigma_S=\sqrt{4\cdot10^7}\approx6\,325$ et $CV\approx15{,}8\ \%$.`},
{ch:5,unit:"",ans:.2299,tol:.02,
 q:String.raw`$N\sim\text{Poisson}(\lambda=1)$ et la sévérité (en k€) vérifie $f_1=0{,}5$, $f_2=0{,}5$.
Avec l'algorithme de Panjer, calculez $g_2=P(S=2)$.`,
 sol:String.raw`$g_0=e^{-1}=0{,}3679$.

$g_1=\lambda\,1\,f_1\,g_0=0{,}5\times0{,}3679=0{,}1839$.

$$g_2=\frac{\lambda}{2}\big(1\cdot f_1\,g_1+2\cdot f_2\,g_0\big)=\frac12(0{,}0920+0{,}3679)\approx0{,}2299.$$`},
{ch:6,unit:"",ans:3454,tol:.01,
 q:String.raw`Pour $X\sim\text{Exp}$ de moyenne $\theta=500$, calculez la **VaR à 99,9 %**.`,
 sol:String.raw`$$\mathrm{VaR}_\alpha=-\theta\ln(1-\alpha)=500\times\ln1000\approx3\,454.$$
Pour mémoire : $\mathrm{VaR}_{99\%}=2\,303$, $\mathrm{TVaR}_{99\%}=2\,803$, $\mathrm{TVaR}_{99{,}9\%}=3\,954$.`},
{ch:6,unit:"",ans:100,tol:.001,
 q:String.raw`Deux obligations indépendantes perdent chacune $100$ avec une probabilité de $3\ \%$, sinon $0$.
Quelle est la VaR à 95 % de la perte totale $S$ ?`,
 sol:String.raw`$P(S=0)=0{,}97^2=94{,}09\ \%<95\ \%$, donc $\mathrm{VaR}_{95\%}(S)=100$.

Chaque obligation a $\mathrm{VaR}_{95\%}=0$ (car $97\ \%\ge95\ \%$) : $100>0+0$, la VaR n'est pas sous-additive.`},
{ch:7,unit:"",ans:19.89,tol:.005,
 q:String.raw`Sur $n=1\,000$ observations, $N_u=50$ dépassent le seuil $u=10$. Les excès suivent une GPD avec $\xi=0{,}5$ et $\sigma=4$.
Calculez la **VaR à 99 %** par la méthode POT.`,
 sol:String.raw`$$\widehat{\mathrm{VaR}}_p=u+\frac{\sigma}{\xi}\Big[\Big(\tfrac{n}{N_u}(1-p)\Big)^{-\xi}-1\Big]=10+8\big[0{,}2^{-0{,}5}-1\big]=10+8\times1{,}2361\approx19{,}89.$$`},
{ch:7,unit:"",ans:37.78,tol:.005,
 q:String.raw`Avec les données de l'exercice précédent ($u=10$, $\xi=0{,}5$, $\sigma=4$, $\widehat{\mathrm{VaR}}_{99\%}=19{,}89$), calculez la **TVaR à 99 %**.`,
 sol:String.raw`$$\widehat{\mathrm{TVaR}}_p=\frac{\widehat{\mathrm{VaR}}_p}{1-\xi}+\frac{\sigma-\xi u}{1-\xi}=\frac{19{,}89}{0{,}5}+\frac{4-5}{0{,}5}=39{,}78-2=37{,}78.$$
Cette formule exige $\xi<1$.`},
{ch:8,unit:"",ans:1.333,tol:.01,
 q:String.raw`Pour une copule de Clayton, $\theta=\dfrac{2\tau}{1-\tau}$. Que vaut $\theta$ quand le tau de Kendall est $\tau=0{,}4$ ?`,
 sol:String.raw`$$\theta=\frac{2\times0{,}4}{1-0{,}4}=\frac{0{,}8}{0{,}6}\approx1{,}333.$$
Pour $\tau=0{,}5$ on obtient $\theta=2$.`},
{ch:9,unit:"€",ans:22.7,tol:.02,
 q:String.raw`Sinistres de Pareto ($\alpha=2{,}5$, $x_m=500$). Quelle est la **prime pure par sinistre** (en €) d'un excédent de sinistre de priorité $d=3\,000$ ?`,
 sol:String.raw`Espérance : $E[X]=\alpha x_m/(\alpha-1)=833{,}3$ €.

$$E[(X-d)_+]=\frac{x_m^{\alpha}\,d^{1-\alpha}}{\alpha-1}=\frac{500^{2{,}5}}{3000^{1{,}5}\times1{,}5}=333{,}3\times\Big(\frac16\Big)^{1{,}5}\approx22{,}7\text{ €}.$$`},
{ch:10,unit:"",ans:106.7,tol:.005,
 q:String.raw`On a $k=10$. Un assuré est observé $5$ ans, avec une charge moyenne de $120$, alors que la moyenne collective est $100$.
Quelle est sa **prime de crédibilité** ?`,
 sol:String.raw`$Z=\dfrac{n}{n+k}=\dfrac5{15}=\dfrac13$.

$$\hat\mu=\tfrac13\times120+\tfrac23\times100\approx106{,}7.$$`},
{ch:11,unit:"%",ans:7.65,tol:.02,
 q:String.raw`Sinistres exponentiels de moyenne $\mu=1\,000$, chargement $\theta=30\ \%$, capital initial $u=10\,000$.
Quelle est la probabilité de ruine $\psi(u)$ (en %) ?`,
 sol:String.raw`$$R=\frac{\theta}{(1+\theta)\mu}=\frac{0{,}3}{1300}=2{,}308\cdot10^{-4},\qquad Ru=2{,}308.$$
$$\psi(u)=\frac{e^{-Ru}}{1+\theta}=\frac{0{,}0994}{1{,}3}\approx7{,}65\ \%.$$`}
];
