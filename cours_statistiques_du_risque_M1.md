# Statistiques du risque – Cours de Master 1 Actuariat

> **Public** : étudiants de M1 actuariat (bases en probabilités, statistique inférentielle, Python ou R).
> **Volume suggéré** : 12 séances de 3 h (1 h 30 de cours + 1 h 30 de TD/TP).
> **Fil rouge** : un portefeuille d'assurance automobile fictif de 10 000 contrats, que l'on suit de la donnée brute jusqu'à la solvabilité.

---

## 0. Objectifs et plan

À la fin du cours, l'étudiant sait :

1. modéliser **fréquence** et **sévérité** des sinistres, et ajuster ces lois à des données ;
2. calculer la loi (ou les moments) de la **charge totale** d'un portefeuille ;
3. mesurer un risque (**VaR, TVaR**) et en discuter les limites ;
4. traiter les **événements extrêmes** (queues lourdes, GPD) ;
5. comprendre la **dépendance** (copules) et la **réassurance** ;
6. tarifer (**prime pure, crédibilité**) et évaluer la **probabilité de ruine** ;
7. valider un modèle par **simulation** et **backtesting**.

| Séance | Thème |
|---|---|
| 1 | Qu'est-ce qu'un risque ? Rappels de probabilités |
| 2 | Modélisation de la fréquence |
| 3 | Modélisation de la sévérité |
| 4 | Estimation et tests d'adéquation |
| 5 | Modèle collectif (charge totale) |
| 6 | Algorithme de Panjer, approximations |
| 7 | Mesures de risque : VaR, TVaR |
| 8 | Valeurs extrêmes (POT, GPD) |
| 9 | Dépendance et copules |
| 10 | Réassurance |
| 11 | Tarification et crédibilité |
| 12 | Théorie de la ruine, simulation, synthèse |

---

## 1. Qu'est-ce qu'un risque ? Rappels

### 1.1 L'idée centrale
Un assureur vend une promesse : payer **si** un événement aléatoire se produit. La statistique du risque répond à trois questions :

- **Combien** de sinistres ? (*fréquence*, variable $N$)
- **De quel montant** chacun ? (*sévérité*, variables $X_1, X_2, \dots$)
- **Combien au total**, et avec quelle chance de dépasser un seuil ? (*charge totale* $S$)

> **Image à retenir** : un dé qui décide *si* vous avez un accident, puis un second dé qui décide *combien ça coûte*. L'actuaire étudie les deux dés ensemble.

### 1.2 Rappels express

| Notion | Définition | Pourquoi c'est utile |
|---|---|---|
| Fonction de répartition | $F(x)=P(X\le x)$ | probabilité de rester sous un budget |
| Fonction de survie | $\bar F(x)=1-F(x)$ | probabilité de **dépasser** un seuil (clé en réassurance) |
| Espérance | $E[X]$ | prime pure |
| Variance | $\mathrm{Var}(X)=E[X^2]-E[X]^2$ | incertitude autour de la moyenne |
| Quantile | $q_\alpha=\inf\{x: F(x)\ge\alpha\}$ | VaR |
| Coef. de variation | $CV=\sigma/\mu$ | risque **relatif**, comparable entre portefeuilles |

### 1.3 Exemple « zéro » : la loi des grands nombres, en action
Un contrat coûte en moyenne 500 € avec un écart-type de 2 000 € (beaucoup de contrats à 0, quelques gros sinistres).
Pour un portefeuille de $n$ contrats indépendants, le coût moyen par contrat a pour écart-type $2000/\sqrt n$ :

| $n$ | écart-type du coût moyen | CV |
|---|---|---|
| 1 | 2 000 € | 400 % |
| 100 | 200 € | 40 % |
| 10 000 | 20 € | 4 % |

**Message** : la **mutualisation** réduit le risque *relatif*, jamais le risque *absolu* (l'écart-type de la somme croît en $\sqrt n$).

---

## 2. Modélisation de la fréquence

### 2.1 Les trois lois à connaître

| Loi | $P(N=k)$ | $E[N]$ | $\mathrm{Var}(N)$ | Quand l'utiliser |
|---|---|---|---|---|
| **Poisson**($\lambda$) | $e^{-\lambda}\lambda^k/k!$ | $\lambda$ | $\lambda$ | cas de base, population homogène |
| **Binomiale négative**($r,p$) | $\binom{k+r-1}{k}p^r(1-p)^k$ | $r(1-p)/p$ | $r(1-p)/p^2$ | **surdispersion** ($\mathrm{Var}>E$) |
| **Binomiale**($n,p$) | $\binom nk p^k(1-p)^{n-k}$ | $np$ | $np(1-p)$ | sous-dispersion, $n$ fixé |

Règle pratique : le rapport **Var / Moyenne** est le premier diagnostic.
- ≈ 1 → Poisson ; > 1 → binomiale négative ; < 1 → binomiale.

### 2.2 Pourquoi la surdispersion ? (intuition)
Dans un portefeuille réel, **tous les assurés n'ont pas le même risque** : un conducteur prudent a $\lambda=0{,}05$, un conducteur à risque $\lambda=0{,}40$. Mélangez des Poisson de paramètres différents (avec $\lambda\sim\text{Gamma}$) et vous obtenez exactement une **binomiale négative**. C'est le « Poisson-Gamma ».

### 2.3 Exemple chiffré (1 000 contrats, 1 an)

| Nb sinistres | 0 | 1 | 2 | 3 | 4 |
|---|---|---|---|---|---|
| Effectif | 860 | 120 | 15 | 4 | 1 |

- Moyenne : $\bar n=(120+2\cdot15+3\cdot4+4\cdot1)/1000=0{,}166$
- $E[N^2]$ empirique $=(120+4\cdot15+9\cdot4+16\cdot1)/1000=0{,}232$
- Variance : $0{,}232-0{,}166^2\approx0{,}204$
- **Var/Moyenne ≈ 1,23 > 1** → soupçon de surdispersion.

Poisson(0,166) prédit $P(N=0)=e^{-0{,}166}\approx0{,}847$, soit 847 contrats sans sinistre (observé : 860).

**Ajustement par la méthode des moments** de la binomiale négative :
$$\hat r=\frac{m^2}{v-m}=\frac{0{,}0276}{0{,}0384}\approx0{,}72,\qquad \hat p=\frac{m}{v}\approx0{,}81.$$
Le faible $\hat r$ traduit une forte hétérogénéité du portefeuille.

### 2.4 Test d'adéquation du $\chi^2$
$$\chi^2=\sum_k\frac{(O_k-E_k)^2}{E_k}$$
Degrés de liberté : (nb de classes) − 1 − (nb de paramètres estimés). Regrouper les classes à faible effectif théorique (< 5).

---

## 3. Modélisation de la sévérité

### 3.1 Catalogue de lois

| Loi | Densité / survie | Queue | Usage typique |
|---|---|---|---|
| **Exponentielle**($\theta$) | $\bar F=e^{-x/\theta}$ | légère | cas pédagogique |
| **Gamma**($a,\theta$) | | légère à modérée | sinistres matériels courants |
| **Log-normale**($\mu,\sigma$) | $\ln X\sim N(\mu,\sigma^2)$ | modérée-lourde | auto, incendie |
| **Weibull**($k,\lambda$) | $\bar F=e^{-(x/\lambda)^k}$ | selon $k$ | durées, sinistres |
| **Pareto**($\alpha,x_m$) | $\bar F=(x_m/x)^\alpha$, $x\ge x_m$ | **lourde** | grands sinistres, RC |

### 3.2 Queue légère vs queue lourde
Une loi est **à queue lourde** si $\bar F$ décroît comme une puissance (Pareto) plutôt qu'exponentiellement.
- Pareto d'indice $\alpha$ : l'espérance existe si $\alpha>1$, la variance si $\alpha>2$.
- **Conséquence concrète** : avec $\alpha\le 2$, la variance est infinie, la moyenne empirique converge très lentement et un seul sinistre peut dominer le portefeuille.

### 3.3 Exemple : le sinistre « moyen » ment
Deux lois de même moyenne $1\,500$ € :
- Exponentielle : $P(X>10\,000)=e^{-10000/1500}\approx0{,}13\ \%$
- Pareto($\alpha=3$, $x_m=1\,000$) : $P(X>10\,000)=(1000/10000)^3=0{,}10\ \%$ ; mais $P(X>100\,000)=10^{-6}$ contre $e^{-66{,}7}\approx0$ pour l'exponentielle.

À moyenne égale, **ce sont les queues qui différencient les risques**.

### 3.4 Troncature et censure
- **Franchise** $d$ : on n'observe que $X>d$ (données *tronquées à gauche*). Il faut ajuster sur la loi conditionnelle $f(x)/\bar F(d)$.
- **Plafond** $L$ : les montants sont *censurés à droite*. La vraisemblance contient $\bar F(L)$ pour ces observations.

---

## 4. Estimation et validation

### 4.1 Méthode des moments vs maximum de vraisemblance

| | Moments | Maximum de vraisemblance (MV) |
|---|---|---|
| Principe | égaler moments théoriques et empiriques | maximiser $\prod f(x_i;\theta)$ |
| Avantage | simple, rapide | efficace, propriétés asymptotiques |
| Limite | instable pour queues lourdes | optimisation numérique parfois |

### 4.2 Exemple : MV de la log-normale (formules fermées)
Pour $x_1,\dots,x_n$ :
$$\hat\mu=\frac1n\sum\ln x_i,\qquad \hat\sigma^2=\frac1n\sum(\ln x_i-\hat\mu)^2.$$

Données (en k€) : 2, 3, 5, 8, 12. Alors $\ln x$ = 0,693 ; 1,099 ; 1,609 ; 2,079 ; 2,485.
$\hat\mu\approx1{,}593$ ; $\hat\sigma^2\approx0{,}437$ ($\hat\sigma\approx0{,}66$).
Moyenne théorique : $e^{\hat\mu+\hat\sigma^2/2}\approx e^{1{,}81}\approx6{,}1$ k€ (moyenne empirique : 6 k€ ✓).

### 4.3 Outils graphiques et tests
1. **Histogramme / fonction de répartition empirique** superposés à la loi ajustée.
2. **QQ-plot** : points alignés sur la droite $y=x$ ⇒ bonne adéquation. Une courbure en queue ⇒ mauvaise modélisation des extrêmes.
3. **Kolmogorov-Smirnov** : $D=\sup_x|F_n(x)-F(x)|$. Attention : p-values biaisées si les paramètres sont estimés sur les mêmes données.
4. **Anderson-Darling** : donne plus de poids aux queues.
5. **Critères d'information** pour comparer des modèles :
$$AIC=2k-2\ln L,\qquad BIC=k\ln n-2\ln L.$$
Plus petit = meilleur ; BIC pénalise davantage la complexité.

### 4.4 Mini-TP Python (à compléter en séance)

```python
import numpy as np
from scipy import stats

rng = np.random.default_rng(42)
x = stats.lognorm.rvs(s=0.9, scale=np.exp(7.0), size=2000, random_state=rng)

# Ajustement de trois lois candidates (loc fixé à 0)
cands = {"lognorm": stats.lognorm, "gamma": stats.gamma, "weibull": stats.weibull_min}
for name, law in cands.items():
    params = law.fit(x, floc=0)
    ll = np.sum(law.logpdf(x, *params))
    aic = 2 * (len(params) - 1) - 2 * ll   # loc fixé : un paramètre de moins
    ks = stats.kstest(x, name if name != "weibull" else "weibull_min", args=params)
    print(f"{name:8s}  AIC={aic:10.1f}  KS={ks.statistic:.4f}")
```
**Questions** : quelle loi gagne ? Est-ce attendu ? Refaire avec un échantillon Pareto : que se passe-t-il ?

---

## 5. Le modèle collectif : la charge totale

### 5.1 Définition
$$S=\sum_{i=1}^{N}X_i\quad(S=0\text{ si }N=0)$$
Hypothèses : les $X_i$ sont **i.i.d.**, **indépendants de $N$**.

### 5.2 Moments (formules à connaître par cœur)
$$E[S]=E[N]\,E[X]$$
$$\mathrm{Var}(S)=E[N]\,\mathrm{Var}(X)+\mathrm{Var}(N)\,E[X]^2$$

**Lecture** : le premier terme = incertitude sur les *montants*, le second = incertitude sur le *nombre*.

**Cas Poisson composé** ($N\sim\text{Poisson}(\lambda)$) : $\mathrm{Var}(S)=\lambda E[X^2]$.

### 5.3 Exemple complet
$N\sim\text{Poisson}(100)$ sinistres par an, $X\sim\text{Exp}$ de moyenne 2 000 € ($E[X^2]=2\cdot2000^2=8\cdot10^6$).

- $E[S]=100\times2000=200\,000$ €
- $\mathrm{Var}(S)=100\times8\cdot10^6=8\cdot10^8$ ⇒ $\sigma_S\approx28\,284$ €
- $CV\approx14{,}1\ \%$

**Approximation normale** du quantile à 99,5 % :
$$200\,000+2{,}576\times28\,284\approx272\,900\ €.$$
Le **besoin de capital** (au-dessus de la prime pure) est donc d'environ 72 900 €, soit 36 % de la charge moyenne.

> **Piège** : l'approximation normale sous-estime les queues quand la distribution est asymétrique. Alternatives : **Gamma translatée**, **Normal-Power**, ou **calcul exact** (Panjer, FFT, simulation).

### 5.4 Stabilité par addition (propriétés utiles)
- Somme de Poisson composés indépendants (même loi de sévérité) = Poisson composé de paramètre $\sum\lambda_j$.
- Le portefeuille de $m$ contrats Poisson($\lambda_0$) est Poisson($m\lambda_0$) : on peut raisonner au niveau du portefeuille.

---

## 6. Algorithme de Panjer : calculer la loi exacte de $S$

### 6.1 Principe
Pour une sévérité **discrète** (en multiples d'une unité monétaire, $f_j=P(X=j)$) et une fréquence de la classe $(a,b,0)$ (Poisson, binomiale, binomiale négative), la récurrence
$$g_0=P(S=0),\qquad g_k=\frac{1}{1-af_0}\sum_{j=1}^{k}\Big(a+\frac{bj}{k}\Big)f_j\,g_{k-j}$$
évite toute convolution.

**Cas Poisson($\lambda$)** : $a=0$, $b=\lambda$ :
$$g_0=e^{-\lambda(1-f_0)},\qquad g_k=\frac{\lambda}{k}\sum_{j=1}^{k}j\,f_j\,g_{k-j}.$$

### 6.2 Exemple détaillé
$\lambda=2$ ; sévérité en milliers d'euros : $f_1=0{,}6$, $f_2=0{,}4$ (donc $f_0=0$).

- $g_0=e^{-2}=0{,}1353$
- $g_1=2\cdot1\cdot0{,}6\cdot g_0=0{,}1624$
- $g_2=\frac22\,(1\cdot0{,}6\,g_1+2\cdot0{,}4\,g_0)=0{,}0974+0{,}1083=0{,}2057$
- $g_3=\frac23\,(0{,}6\,g_2+0{,}8\,g_1)=\frac23(0{,}1234+0{,}1299)=0{,}1689$

Vérification : $E[S]=\lambda E[X]=2\times1{,}4=2{,}8$ k€. En poursuivant la récurrence, on retrouve cette moyenne.
**Interprétation** : $P(S=3\text{ k€})\approx16{,}9\ \%$.

---

## 7. Mesures de risque : VaR et TVaR

### 7.1 Définitions
- **Value-at-Risk** : $\mathrm{VaR}_\alpha(L)=\inf\{x: P(L\le x)\ge\alpha\}$.
  « Avec probabilité $\alpha$, la perte ne dépassera pas ce montant. »
- **Tail-VaR** (Expected Shortfall) : $\mathrm{TVaR}_\alpha(L)=\dfrac1{1-\alpha}\displaystyle\int_\alpha^1\mathrm{VaR}_u(L)\,du$.
  « Perte moyenne **dans les cas où** on dépasse la VaR. »

Cadre réglementaire : Solvabilité II utilise la VaR à 99,5 % sur 1 an ; Bâle / SST utilisent l'ES / TVaR.

### 7.2 Exemple discret (pour *voir* la différence)
| Perte | 0 | 1 000 | 10 000 |
|---|---|---|---|
| Probabilité | 90 % | 9 % | 1 % |

- $\mathrm{VaR}_{95\%}=1\,000$ ; $\mathrm{VaR}_{99\%}=1\,000$
- $\mathrm{TVaR}_{99\%}=10\,000$
- $\mathrm{TVaR}_{95\%}=\dfrac{0{,}01\times10\,000+0{,}04\times1\,000}{0{,}05}=2\,800$

**La VaR à 99 % dit « 1 000 » ; la TVaR révèle qu'au-delà, c'est 10 000.** La VaR ignore la gravité de ce qui se passe après le seuil.

### 7.3 Formules fermées (exponentielle de moyenne $\theta$)
$$\mathrm{VaR}_\alpha=-\theta\ln(1-\alpha),\qquad \mathrm{TVaR}_\alpha=\mathrm{VaR}_\alpha+\theta.$$
Pour $\theta=1\,000$ et $\alpha=99\ \%$ : VaR = 4 605 ; TVaR = 5 605.

### 7.4 Mesures cohérentes (Artzner et al., 1999)
Une mesure $\rho$ est **cohérente** si elle vérifie :
1. **Monotonie** : $L_1\le L_2\Rightarrow\rho(L_1)\le\rho(L_2)$
2. **Invariance par translation** : $\rho(L+c)=\rho(L)+c$
3. **Homogénéité positive** : $\rho(\lambda L)=\lambda\rho(L)$
4. **Sous-additivité** : $\rho(L_1+L_2)\le\rho(L_1)+\rho(L_2)$ (*la diversification ne peut pas augmenter le risque*)

TVaR est cohérente ; **VaR ne l'est pas** (en général, elle n'est pas sous-additive).

### 7.5 Contre-exemple classique : VaR non sous-additive
Deux obligations indépendantes : chacune perd 100 avec probabilité 4 %, sinon 0.
- Pour chacune : $\mathrm{VaR}_{95\%}=0$ (car $P(L=0)=96\%\ge95\%$).
- Pour la somme : $P(S=0)=0{,}96^2=92{,}16\ \%<95\%$ ⇒ $\mathrm{VaR}_{95\%}(S)=100>0+0$.

La VaR de la somme dépasse la somme des VaR : **elle décourage la diversification**.

### 7.6 Estimation empirique et backtesting
- Estimation : quantile empirique d'un échantillon simulé ou historique.
- **Backtesting** : compter les exceptions (pertes > VaR). À 99 %, sur 250 jours on attend 2,5 exceptions ; test de Kupiec sur la binomiale($250$, $1\%$).

---

## 8. Valeurs extrêmes

### 8.1 Pourquoi un chapitre dédié ?
Les lois classiques sont ajustées sur le **centre** des données ; or le capital se joue dans la **queue**. La théorie des valeurs extrêmes (TVE) modélise *directement* la queue.

### 8.2 Deux approches
1. **Maxima par blocs** : le maximum annuel converge vers une loi **GEV** (Fisher-Tippett).
2. **Dépassements de seuil (POT)** : au-dessus d'un seuil $u$ élevé, les excès $Y=X-u$ suivent approximativement une **loi de Pareto généralisée (GPD)** (théorème de Pickands-Balkema-de Haan) :
$$G_{\xi,\sigma}(y)=1-\Big(1+\xi\frac y\sigma\Big)^{-1/\xi},\quad\xi\ne0.$$

L'**indice de queue** $\xi$ résume tout :
- $\xi>0$ : queue lourde (Pareto), $\alpha=1/\xi$ ;
- $\xi=0$ : queue exponentielle ;
- $\xi<0$ : support borné.

### 8.3 Choix du seuil : le compromis biais-variance
- Seuil trop bas → l'approximation GPD est mauvaise (biais).
- Seuil trop haut → trop peu d'observations (variance).
- Outils : **mean excess plot** (linéaire croissant ⇒ Pareto), **stabilité de $\hat\xi$** en fonction de $u$.

### 8.4 Estimateur de Hill
Pour $\xi>0$, avec $X_{(1)}\le\dots\le X_{(n)}$ :
$$\hat\xi_k=\frac1k\sum_{i=1}^{k}\ln\frac{X_{(n-i+1)}}{X_{(n-k)}}.$$

### 8.5 VaR et TVaR extrêmes
Avec $N_u$ dépassements parmi $n$ observations :
$$\widehat{\mathrm{VaR}}_p=u+\frac{\hat\sigma}{\hat\xi}\Big[\Big(\tfrac{n}{N_u}(1-p)\Big)^{-\hat\xi}-1\Big],$$
$$\widehat{\mathrm{TVaR}}_p=\frac{\widehat{\mathrm{VaR}}_p}{1-\hat\xi}+\frac{\hat\sigma-\hat\xi u}{1-\hat\xi}\quad(\hat\xi<1).$$

**Remarque** : si $\xi\ge1$, la TVaR est infinie : le risque est **non assurable** sans plafond.

---

## 9. Dépendance et copules

### 9.1 Le piège de la corrélation
La corrélation linéaire $\rho$ ne mesure que la dépendance **linéaire** et ne capture pas le fait que, **en crise, tout s'effondre ensemble**.
Exemple : $X\sim N(0,1)$ et $Y=X^2$ sont totalement dépendants mais $\mathrm{Corr}(X,Y)=0$.

### 9.2 Théorème de Sklar
Toute loi conjointe se décompose en **marginales** + **copule** :
$$F(x_1,\dots,x_d)=C\big(F_1(x_1),\dots,F_d(x_d)\big).$$
La copule $C$ contient *toute* l'information de dépendance, indépendamment des marginales.

### 9.3 Copules usuelles

| Copule | Dépendance de queue | Usage |
|---|---|---|
| Gaussienne | **aucune** | modèle de référence (et critiqué en 2008) |
| Student-$t$ | symétrique, haut et bas | marchés financiers, événements joints |
| Clayton | **queue basse** | pertes simultanées sévères |
| Gumbel | **queue haute** | événements extrêmes joints |

### 9.4 Mesures de dépendance par rangs
- **Tau de Kendall** $\tau$ et **rho de Spearman** : invariants par transformations croissantes, directement liés à la copule.
- Pour Clayton : $\theta=2\tau/(1-\tau)$. Un $\tau=0{,}5$ donne $\theta=2$.

### 9.5 Illustration par simulation
Simuler 1 000 couples avec la même corrélation (0,6) via copule gaussienne puis Student ($\nu=4$). Les deux nuages ont même corrélation mais le second présente nettement **plus de points extrêmes joints** : à corrélation égale, la sévérité d'un événement catastrophe dépend de la copule.

---

## 10. Réassurance

### 10.1 Les traités de base

| Traité | Part cédée | Commentaire |
|---|---|---|
| **Quote-part** | $(1-k)\cdot X$ | proportionnel, partage prime et sinistres |
| **Excédent de sinistre (XS)** | $\min\{(X-d)_+,\,L\}$ | non proportionnel, protège de chaque gros sinistre |
| **Stop-loss** | $(S-a)_+$ | protège la charge totale annuelle |

### 10.2 Prime pure d'un excédent de sinistre
$$E[(X-d)_+]=\int_d^\infty\bar F(x)\,dx.$$

**Exemple Pareto** ($\alpha=3$, $x_m=1\,000$, priorité $d=5\,000$) :
$$E[(X-d)_+]=\frac{x_m^\alpha\,d^{1-\alpha}}{\alpha-1}=\frac{10^9\times5000^{-2}}{2}=20\ €.$$

- Moyenne d'un sinistre : 1 500 € ; excès moyen par sinistre : 20 €.
- Probabilité de toucher la couverture : $(1/5)^3=0{,}8\ \%$.
- Avec $\lambda=100$ sinistres/an : prime pure du réassureur $=100\times20=2\,000$ € /an.

**Lecture** : l'assureur cède une part infime de la charge moyenne, mais élimine l'essentiel de la **volatilité**, car l'excédent coûte peu et capte les gros sinistres.

### 10.3 Stop-loss et ordre convexe
Parmi toutes les couvertures de même coût moyen, le **stop-loss minimise la variance** de la rétention (théorème de Vajda / ordre stop-loss). C'est la couverture « optimale » pour la réduction de variance.

---

## 11. Tarification et crédibilité

### 11.1 Structure d'un tarif
$$\text{Prime commerciale}=\underbrace{E[S]}_{\text{prime pure}}+\underbrace{\text{chargement de sécurité}}_{\text{p.ex. }\theta E[S]\text{ ou }\kappa\,\sigma_S}+\underbrace{\text{frais, marge}}_{}$$
Principes de calcul : espérance, variance ($E+\beta\mathrm{Var}$), écart-type, exponentiel.

### 11.2 Tarification a priori : les GLM (aperçu)
- **Fréquence** : régression de Poisson, lien log, avec **offset** $\ln(\text{exposition})$.
- **Sévérité** : régression Gamma, lien log.
- Prime pure $=$ fréquence $\times$ coût moyen.

Lien log ⇒ modèle **multiplicatif** : $\lambda_i=\lambda_0\times e^{\beta_{\text{jeune}}}\times e^{\beta_{\text{urbain}}}\times\cdots$

### 11.3 Tarification a posteriori : la crédibilité de Bühlmann
Un assuré a-t-il son *propre* niveau de risque ? On mélange expérience individuelle et moyenne collective :
$$\hat\mu_i=Z\,\bar X_i+(1-Z)\,\mu,\qquad Z=\frac{n}{n+k},\qquad k=\frac{E[\sigma^2(\Theta)]}{\mathrm{Var}(\mu(\Theta))}.$$

- $E[\sigma^2(\Theta)]$ = variance **intra** assuré (bruit) ;
- $\mathrm{Var}(\mu(\Theta))$ = variance **inter** assurés (vrai signal).

### 11.4 Exemple chiffré
Variance intra $=400$, variance inter $=100$ ⇒ $k=4$.
Un assuré observé $n=8$ ans, charge moyenne $\bar X=50$, charge moyenne du portefeuille $\mu=40$ :
$$Z=\frac{8}{8+4}=\frac23,\qquad \hat\mu=\frac23\cdot50+\frac13\cdot40\approx46{,}7.$$
**Intuition** : plus l'historique est long ($n$ grand) ou plus les assurés diffèrent réellement ($k$ petit), plus on fait confiance à l'historique individuel.

---

## 12. Théorie de la ruine

### 12.1 Le modèle de Cramér-Lundberg
Réserve à l'instant $t$ :
$$U(t)=u+ct-\sum_{i=1}^{N(t)}X_i,$$
où $u$ = capital initial, $c$ = taux de prime, $N(t)$ processus de Poisson d'intensité $\lambda$.
**Chargement de sécurité** $\theta$ : $c=(1+\theta)\lambda E[X]$.

Probabilité de ruine : $\psi(u)=P(\exists t:U(t)<0)$.

### 12.2 Résultats clés
- **Condition de profit net** : $\theta>0$, sinon $\psi(u)=1$.
- **Inégalité de Lundberg** : $\psi(u)\le e^{-Ru}$, où $R>0$ résout $\lambda\big(M_X(R)-1\big)=cR$.
- **Sinistres exponentiels** (formule exacte) :
$$\psi(u)=\frac1{1+\theta}\exp\Big(-\frac{\theta\,u}{(1+\theta)\,\mu}\Big).$$

### 12.3 Exemple chiffré
$\mu=E[X]=1\,000$ €, $\theta=20\ \%$, capital $u=10\,000$ €.
$$R=\frac{\theta}{(1+\theta)\mu}=\frac{0{,}2}{1\,200}=1{,}667\cdot10^{-4},\quad Ru=1{,}667.$$
- Borne de Lundberg : $e^{-1{,}667}\approx18{,}9\ \%$
- Probabilité exacte : $\psi(u)=0{,}189/1{,}2\approx15{,}7\ \%$

**Pour viser $\psi\le1\ \%$** : $\exp(-Ru)\le0{,}012$ ⇒ $u\ge\ln(83{,}3)/R\approx26\,500$ €.
Le capital nécessaire est lié au **chargement** : plus $\theta$ est élevé, plus $R$ est grand et moins il faut de capital.

### 12.4 Limites du modèle
Hypothèses fortes (Poisson stationnaire, pas d'intérêts, pas de dividendes, horizon infini). En pratique : on préfère la ruine à **horizon fini** et la simulation.

---

## 13. Simulation et rééchantillonnage

### 13.1 Monte Carlo pour la charge totale

```python
import numpy as np
rng = np.random.default_rng(1)

n_sim, lam, mean_x = 100_000, 100, 2000
N = rng.poisson(lam, n_sim)
S = np.array([rng.exponential(mean_x, k).sum() for k in N])

alpha = 0.995
var = np.quantile(S, alpha)
tvar = S[S >= var].mean()
print(f"E[S]={S.mean():,.0f}  VaR99.5={var:,.0f}  TVaR99.5={tvar:,.0f}")
```
**Questions** : (1) comparer avec l'approximation normale du §5.3 (272 900 €) ; laquelle est la plus fiable et pourquoi ? (2) Quelle est l'erreur d'estimation de la VaR 99,5 % pour $n_{sim}=10^3$, $10^5$ ?

### 13.2 Bootstrap
Rééchantillonner **avec remise** les sinistres observés pour obtenir un intervalle de confiance sur $E[S]$, la VaR ou $\hat\xi$ — sans hypothèse de loi. Limite : le bootstrap ne fabrique pas de valeurs plus grandes que le maximum observé (mauvais pour les extrêmes) ⇒ préférer le bootstrap paramétrique ou la GPD.

### 13.3 Risque de modèle
Toujours mesurer :
- **risque d'estimation** (incertitude sur les paramètres) ;
- **risque de spécification** (mauvaise famille de lois) ;
- **risque de processus** (le hasard pur).

---

## 14. Exercices de TD (avec indications)

**Ex. 1 (Fréquence).** Un portefeuille présente moyenne $0{,}25$ et variance $0{,}40$ sinistres par contrat.
a) Quelle loi proposer ? b) Estimer les paramètres de la binomiale négative par moments.
*Réponse : surdispersion (ratio 1,6) ; $\hat r=m^2/(v-m)=0{,}0625/0{,}15\approx0{,}417$, $\hat p=m/v=0{,}625$.*

**Ex. 2 (Charge totale).** $N\sim\text{Poisson}(50)$, $X\sim\text{Gamma}$ de moyenne 800 et d'écart-type 400.
Calculer $E[S]$, $\mathrm{Var}(S)$, $CV$.
*Réponse : $E[S]=40\,000$ ; $E[X^2]=800^2+400^2=800\,000$ ; $\mathrm{Var}(S)=50\times800\,000=4\cdot10^7$ ; $\sigma_S\approx6\,325$ ; $CV\approx15{,}8\ \%$.*

**Ex. 3 (VaR/TVaR).** Pour $X\sim\text{Exp}(\theta=500)$, calculer VaR et TVaR à 99 % et 99,9 %.
*Réponse : VaR99 $=2\,303$, TVaR99 $=2\,803$ ; VaR99,9 $=3\,454$, TVaR99,9 $=3\,954$.*

**Ex. 4 (Sous-additivité).** Reprendre le contre-exemple §7.5 avec probabilité de perte 3 % : la VaR à 95 % est-elle encore non sous-additive ?
*Réponse : $P(S=0)=0{,}97^2=94{,}09\ \%<95\ \%$ ⇒ oui, $\mathrm{VaR}(S)=100>0$.*

**Ex. 5 (Pareto).** Sinistres Pareto($\alpha=2{,}5$, $x_m=500$). a) Calculer $E[X]$. b) Un XS de priorité 3 000 : quelle est la prime pure par sinistre ?
*Réponse : a) $E[X]=\alpha x_m/(\alpha-1)=833{,}3$ ; b) $\dfrac{500^{2{,}5}\cdot3000^{-1{,}5}}{1{,}5}=\dfrac{500}{1{,}5}\cdot(500/3000)^{1{,}5}\approx333{,}3\times0{,}0680\approx22{,}7$ €.*

**Ex. 6 (Crédibilité).** $k=10$, assuré observé 5 ans avec moyenne 120, moyenne collective 100. Calculer $Z$ et la prime.
*Réponse : $Z=5/15=1/3$ ; prime $=\frac13\cdot120+\frac23\cdot100\approx106{,}7$.*

**Ex. 7 (Ruine).** Reprendre §12.3 avec $\theta=30\ \%$, $u=10\,000$, $\mu=1\,000$.
*Réponse : $R=0{,}3/1300=2{,}308\cdot10^{-4}$, $Ru=2{,}308$ ; $\psi=e^{-2{,}308}/1{,}3\approx7{,}7\ \%$.*

---

## 15. Évaluation suggérée

| Composante | Poids |
|---|---|
| Contrôle continu : 3 TP rendus (fréquence-sévérité, VaR par simulation, TVE) | 30 % |
| Projet : étude d'un jeu de données de sinistres (ajustement, charge totale, VaR/TVaR, réassurance) | 30 % |
| Examen final écrit (2 h) | 40 % |

### Compétences évaluées
1. Choisir et justifier un modèle (diagnostics, AIC/BIC, QQ-plots).
2. Calculer correctement moments et quantiles de $S$.
3. Interpréter VaR/TVaR et critiquer leurs limites.
4. Communiquer un résultat avec ses incertitudes.

---

## 16. Pour aller plus loin

- Denuit, M. & Charpentier, A., *Mathématiques de l'assurance non-vie*, Economica.
- Klugman, Panjer, Willmot, *Loss Models: From Data to Decisions*.
- McNeil, Frey, Embrechts, *Quantitative Risk Management*.
- Embrechts, Klüppelberg, Mikosch, *Modelling Extremal Events*.
- Charpentier, A. (éd.), *Computational Actuarial Science with R*.

> **Conseil pédagogique** : à chaque séance, partir d'une **question concrète** (« quel capital pour que l'assureur survive 199 années sur 200 ? »), la traiter d'abord par **simulation** pour l'intuition, puis par la **formule** pour la compréhension.
