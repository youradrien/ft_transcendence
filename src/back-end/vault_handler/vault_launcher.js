// Ce module gère l'initialisation, le déverrouillage et la création de tokens
// pour une instance HashiCorp Vault utilisée par l'application.
// Il expose des fonctions utilitaires pour démarrer Vault, arrêter/fermer
// proprement (sauvegarde des clés), créer des tokens utilisateur/backend,
// et lire/écrire des secrets dans le moteur KV v2.
//
// IMPORTANT: Ce fichier NE MODIFIE PAS la logique existante — seules des
// annotations et des commentaires JSDoc ont été ajoutés pour la lisibilité.
const fs = require('fs');
const path = require('path');
const certPath = path.resolve('/app/vault_certs/vault.crt');
const customCa = fs.readFileSync(certPath);
const vault = require('node-vault')({
  apiVersion: 'v1',
  endpoint: process.env.VAULT_ADDR || 'https://vault:8200',
  requestOptions: {
    ca: customCa,
  },
});

let rootToken = 'initResult.root_token';
let keys = 'initResult.keys';

async function vaultstart() {

	/**
	 * Démarre/initialise Vault si nécessaire, déverrouille le coffre et crée
	 * un token backend utilisable par l'application.
	 *
	 * Comportement:
	 * - Si Vault n'est pas initialisé : init -> unseal -> mount KVv2 -> addPolicy -> createBackendToken
	 * - Si Vault est initialisé mais scellé : récupère les clés sauvegardées et unseal
	 * - Si Vault est déjà déverrouillé : crée simplement un token backend
	 *
	 * @async
	 * @returns {Promise<string>} backendToken - Le token backend créé (client_token)
	 * @throws {Error} Relance toute erreur provenant des appels à l'API Vault
	 */
	const isiInit = await vault.initialized();
	console.log('Initialized? ', isiInit.initialized );
	//premiere initialisation
	if (!isiInit.initialized) 
	{
		console.log('Initializing Vault...');
		const initResult = await vault.init({ secret_shares: 1, secret_threshold: 1 });
		 rootToken = initResult.root_token;
		 keys = initResult.keys;

		vault.token = rootToken;
	
		console.log('Unsealing Vault...');
		await vault.unseal({ key: keys[0] });
		console.log('Vault initialized and unsealed.');

		// Save keys immediately to ensure persistence even if crash occurs
		const secretsDir = path.resolve(__dirname, 'secrets');
		if (!fs.existsSync(secretsDir)) {
			fs.mkdirSync(secretsDir, { recursive: true });
		}
		const savepath = path.resolve(secretsDir, 'vault_keys.json');

		fs.writeFileSync(savepath, JSON.stringify({keys, rootToken}, null, 2), { mode: 0o600 });


		//MOUNT le secret envgin
		await vault.mount({ mount_point: 'secret', type: 'kv-v2', options: { version: '2' }});

		//add policy backend
		const rulepath = path.resolve(__dirname, 'backend-policy.hcl');
	 	rules = fs.readFileSync(rulepath, 'utf8');
		await vault.addPolicy({ name: 'backend-policy', rules });

		//need delete le .env containing jwt secret after writing to vault
		const jwtSecret =  process.env.JWT_SECRET;
		await writeSecret('jwt', { value: jwtSecret});

		
		//delete env containing jwt secret
		//NEED
	
		console.log('Creating backend token...');
		const backendToken = await createBackendToken(rootToken);
		console.log('Backend token created1.', backendToken);
		vault.token = backendToken;
		return backendToken;
	}

	//vault déjà initialisé, un redémarrage
	else
	{
		const issealed = await vault.status();
		if (issealed.sealed) {
			console.log('already init, Unsealing Vault...');
			//récupérer les clés
			const savepath = path.resolve(__dirname, 'secrets', 'vault_keys.json');
			console.log('savepath2: ', savepath);
			
			if (!fs.existsSync(savepath)) {
				// Fallback for CI/Dev: if keys are missing but we are in dev mode with root token
				if (process.env.VAULT_TOKEN === 'root') {
					console.log('⚠️ No keys file found, but running with root token. Assuming dev mode.');
					vault.token = 'root';
					return await createBackendToken();
				}
				throw new Error(`Vault is sealed and keys file not found at ${savepath}`);
			}

			const data = JSON.parse(fs.readFileSync(savepath, 'utf8'));
			 keys=data.keys;
			 rootToken=data.rootToken;

			await vault.unseal({ key: keys[0] });
			console.log('Vault unsealed.');
			vault.token = rootToken;
		}
		else {
			console.log('Vault is already unsealed.');
			const savepath = path.resolve(__dirname,'secrets', 'vault_keys.json');
			console.log('savepath1: ', savepath);

			if (!fs.existsSync(savepath)) {
				// Fallback for CI/Dev: if keys are missing but we are in dev mode with root token
				if (process.env.VAULT_TOKEN === 'root') {
					console.log('⚠️ No keys file found, but running with root token. Assuming dev mode.');
					vault.token = 'root';
					return await createBackendToken();
				}
				// If not root, we can't proceed without keys/token
				throw new Error(`Vault is unsealed but keys file not found at ${savepath}`);
			}

			const data = JSON.parse(fs.readFileSync(savepath, 'utf8'));
			keys=data.keys;
			rootToken=data.rootToken;
			console.log('read from file : marootToken:', rootToken, 'keys:', keys);
			vault.token = rootToken;

		}

		console.log('Creating  tokens...');
		const backToken = await createBackendToken();
		console.log('Backend token created2.: ', backToken);
		vault.token = backToken;
		const jwtSecret =  process.env.JWT_SECRET;
		if (jwtSecret)
			await writeSecret('jwt', { value: jwtSecret});
		
		return backToken;
	}
}

async function createBackendToken() {
	/**
	 * Crée un token pour l'application backend avec la policy 'backend-policy'.
	 * Ce token est destiné aux services internes pour accéder aux secrets.
	 *
	 * @async
	 * @returns {Promise<string>} client_token - Le token Vault créé (chaîne)
	 * @throws {Error} Relance l'erreur en cas d'échec
	 */
  try {
    const { auth } = await vault.tokenCreate({
      policies: ['backend-policy'],
      ttl: '24h',
    });

    return auth.client_token;
  } catch (err) {
    console.error('Erreur lors de la création du token backend :', err);
    throw err;
  }
}

async function vaultdown() {
	/**
	 * Procédure de fermeture/arrêt du gestionnaire Vault.
	 * Elle peut sauvegarder les clés/rootToken dans un fichier chiffré ou protégé
	 * (ici écrit en clair dans ./secrets/vault_keys.json avec mode 600).
	 *
	 * NOTE: la logique de sauvegarde suppose que les variables `keys` et
	 * `rootToken` sont accessibles dans le scope au moment de l'appel.
	 *
	 */
	try
	{
	  // Ici, on pourrait implémenter une logique pour "fermer" Vault si nécessaire
  		console.log('Vault handler is shutting down.');
		const savepath = path.resolve(__dirname, 'secrets', 'vault_keys.json');
		console.log('Saving Vault keys to:', savepath);
		fs.writeFileSync(savepath, JSON.stringify({keys, rootToken}, null, 2), { mode: 0o600 });

	}
	catch(err)
	{
		console.error('Erreur lors de la fermeture de Vault :', err);
	}

}

/**
 * Écrit un secret dans Vault KV v2
 * @param {string} secretPath - Le chemin complet du secret (après "secret/data/")
 * @param {Object} data - Les données à stocker dans le secret
 */
async function writeSecret(secretPath, data) {
  try {
    await vault.write(`secret/data/${secretPath}`, { data });
    console.log(`Secret enregistré avec succès dans Vault à '${secretPath}' !`);
  } catch (err) {
    console.error(`Erreur lors de l’écriture du secret '${secretPath}':`, err);
  }
}

async function readSecret(secretPath) {
	/**
	 * Lit un secret stocké dans le moteur KV v2 de Vault.
	 *
	 * @async
	 * @param {string} secretPath - Le chemin relatif du secret dans KV v2
	 *   (ex: pour lire secret/data/foo on passe 'foo')
	 * @returns {Promise<Object|undefined>} data - Les données du secret (ou undefined si erreur)
	 */
  try {
	console.log("read with tken", vault.token);
    const data = await vault.read(`secret/data/${secretPath}`);
    console.log(`Secret lu avec succès dans Vault à '${secretPath}' !`);
	return data.data.data;
  } catch (err) {
    console.error(`Erreur lors de la lecture du secret '${secretPath}':`, err);
  }
}

module.exports = {
	vault,
	vaultstart,
	vaultdown,
	writeSecret,
	readSecret
};