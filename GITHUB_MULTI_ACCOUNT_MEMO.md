# GitHub Multi-Account Memo

## Objectif

Aide-memoire rapide pour utiliser:

- `Akerman64` sur certains repos
- `DeltaPartners92` sur d'autres repos

Cette machine est deja configuree avec deux alias SSH:

- `github-akerman64`
- `github-deltapartners92`

## Regle simple

Dans chaque repo, il faut verifier 2 choses:

1. l'identite du commit
2. le remote GitHub utilise pour `push`

## Repo avec `Akerman64`

Dans le repo:

```bash
git config user.name "Akerman64"
git config user.email "akerman64@users.noreply.github.com"
git remote set-url origin git@github-akerman64:Akerman64/NOM_DU_REPO.git
```

Exemple pour Xelal-AI:

```bash
git config user.name "Akerman64"
git config user.email "akerman64@users.noreply.github.com"
git remote set-url origin git@github-akerman64:Akerman64/Xelal-AI.git
```

## Repo avec `DeltaPartners92`

Dans le repo:

```bash
git config user.name "DeltaPartners92"
git config user.email "deltapartners92@users.noreply.github.com"
git remote set-url origin git@github-deltapartners92:DeltaPartners92/NOM_DU_REPO.git
```

## Verification rapide avant push

Toujours verifier:

```bash
git config user.name
git config user.email
git remote -v
```

Tu dois voir:

Pour `Akerman64`:

```text
Akerman64
akerman64@users.noreply.github.com
origin  git@github-akerman64:Akerman64/NOM_DU_REPO.git (fetch)
origin  git@github-akerman64:Akerman64/NOM_DU_REPO.git (push)
```

Pour `DeltaPartners92`:

```text
DeltaPartners92
deltapartners92@users.noreply.github.com
origin  git@github-deltapartners92:DeltaPartners92/NOM_DU_REPO.git (fetch)
origin  git@github-deltapartners92:DeltaPartners92/NOM_DU_REPO.git (push)
```

## Tester l'auth SSH

Pour verifier que la machine parle bien au bon compte:

```bash
ssh -T git@github-akerman64
ssh -T git@github-deltapartners92
```

Reponse attendue:

```text
Hi Akerman64! You've successfully authenticated, but GitHub does not provide shell access.
```

ou

```text
Hi DeltaPartners92! You've successfully authenticated, but GitHub does not provide shell access.
```

## Push normal

Une fois le repo bien configure:

```bash
git push
```

Pour la premiere fois sur une branche:

```bash
git push -u origin main
```

ou

```bash
git push -u origin NOM_DE_LA_BRANCHE
```

## Si le push est refuse

Verifier:

```bash
git remote -v
git config user.name
git config user.email
```

Puis verifier l'auth SSH:

```bash
ssh -T git@github-akerman64
ssh -T git@github-deltapartners92
```

## Rappel important

- `git config user.name` et `git config user.email` definissent le nom du commit
- le remote SSH definit quel compte GitHub fait le `push`
- il faut les deux pour etre propre et ne pas se tromper

## Recette ultra-courte

Pour un repo `Akerman64`:

```bash
git config user.name "Akerman64"
git config user.email "akerman64@users.noreply.github.com"
git remote set-url origin git@github-akerman64:Akerman64/NOM_DU_REPO.git
```

Pour un repo `DeltaPartners92`:

```bash
git config user.name "DeltaPartners92"
git config user.email "deltapartners92@users.noreply.github.com"
git remote set-url origin git@github-deltapartners92:DeltaPartners92/NOM_DU_REPO.git
```

