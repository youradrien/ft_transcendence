pour creer un nouveau secret il faut un token lautorisant
avec le token backend on peut creer des secrets avec ma fonction writesecret
faut fournier key value:
 ex: writeSecret('jwt', { value: jwtSecret});

 le token pour s'id aupres de vault est dans l'objet vault, sous vault.token
 la fonction gere ca d'elle meme. a condition d'avoir acces a l'objet vault ofc

 en gros
 on fout toutes les cles dans le vault au demarrage
 on delete toute leurs traces sur le disk pour ne garder que les unseal key et root token du vault dans un dossier secure
 et au debut du prog on ouvre le  vault et fourni un token au backend
 avec ce token vous aurez acces au secret que vous avez stocker pour les foutres en memoire, et c tout
 pour lire:
 readSecret(secretPath) #path c'est le nom du secret en gros, comme jwt plus haut

 le vault ecrit au shutdown les cles root et unseal dans vault_handler/secrets/vault_keys.json
 a voir un stockage plus stylé et secure



 pour jules:
 jai eu des modif a faire sur les entrypoint du backend pour eviter des merdes de sync ssans trop comprendre le pk mais la ca a l'air de fontionner, check si ca te fous pas dedans