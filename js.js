const corpusInput = document.getElementById("corpus");
const corpus2Input = document.getElementById("corpus-2");
const outputTextarea = document.getElementById("output");

const numGramsSlider = document.getElementById("num-grams");
const numGramsLabel = document.getElementById("num-grams-label");

const gramsToGenerateSlider = document.getElementById("grams-to-generate");
const gramsToGenerateLabel = document.getElementById("grams-to-generate-label");

const temperatureSlider = document.getElementById("temperature");
const temperatureLabel = document.getElementById("temperature-label");

const generateBtn = document.getElementById("generate-btn");

let numGrams = parseInt(numGramsSlider.value);
let gramsToGenerate = parseInt(gramsToGenerateSlider.value);
let temperature = parseFloat(temperatureSlider.value);

let nGrams = {};

function updateNumGrams() {
	const grams = parseInt(numGramsSlider.value);
	numGrams = grams;
	
	numGramsLabel.textContent = numGrams + " " + (numGrams === 1 ? "gram" : "grams");
}

function updateNumGramsToGenerate() {
	const grams = parseInt(gramsToGenerateSlider.value);
	gramsToGenerate = grams;
	
	gramsToGenerateLabel.textContent = gramsToGenerate + " " + (gramsToGenerate === 1 ? "gram" : "grams");
}

function updateTemperature() {
	const temp = parseFloat(temperatureSlider.value);
	temperature = temp;
	
	temperatureLabel.textContent = temperature.toString();
}

numGramsSlider.addEventListener("input", updateNumGrams);
gramsToGenerateSlider.addEventListener("input", updateNumGramsToGenerate);
temperatureSlider.addEventListener("input", updateTemperature);

function applyGeneratedText(text) {
	outputTextarea.textContent = text;
}

const punctuation = ",.!%\"\'?“”’()-$".split("");

function tokenizeText(text) {
	const tokens = [];
	
	let currentToken = "";
	let currentTokenIsAN = false;
	let currentTokenIsPunctuation = false;
	
	for(let i = 0; i < text.length; i++) {
		let char = text[i];
		
		if(isAlphaNumeric(char)) {
			if(!currentToken) {
				currentToken += char;
				currentTokenIsAN = true;
				currentTokenIsPunctuation = false;
			} else if(currentToken && currentTokenIsAN) {
				currentToken += char;
			} else if(currentToken && currentTokenIsPunctuation) {
				tokens.push(currentToken);
				currentToken = char;
				currentTokenIsPunctuation = false;
				currentTokenIsAN = true;
			}
		} else {
			if(punctuation.includes(char)) {
				if(!currentToken) {
					currentToken = char;
					currentTokenIsPunctuation = true;
					currentTokenIsAN = false;
				} else if(currentToken && currentTokenIsAN) {
					tokens.push(currentToken);
					currentToken = char;
					currentTokenIsPunctuation = true;
					currentTokenIsAN = false;
				} else if(currentToken && currentTokenIsPunctuation) {
					tokens.push(currentToken);
					currentToken = char;
					currentTokenIsPunctuation = true;
					currentTokenIsAN = false;
				}
			} else if(char === "\n") {
				tokens.push(currentToken);
				currentToken = "";
				currentTokenIsPunctuation = false;
				currentTokenIsAN = false;
				
				tokens.push("\n");
			} else if(currentToken) {
				tokens.push(currentToken);
				currentToken = "";
				currentTokenIsPunctuation = false;
				currentTokenIsAN = false;
			}
		}
	}
	
	return tokens;
}

function randomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rn(arr) {
	return arr[randomInt(0, arr.length - 1)];
}

function getPreviousTokens(numGrams, generatedTokens) {
	const previousTokens = [];
	
	for(let i = 0; i < numGrams && i < generatedTokens.length; i++) {
		let j = generatedTokens.length - i - 1;
		let token = generatedTokens[j];
		
		previousTokens.unshift(token);
	}
	
	return previousTokens;
}

function getNode(previousTokens, numGrams, isFixed, temperature, nGramsMap) {
	const originalPreviousTokens = previousTokens;
	
	if(!isFixed) {
		let modifier = (Math.random() * 2 - 1) * temperature * numGrams;
		numGrams = numGrams + modifier;

		if(numGrams < 1) numGrams = 1;
		if(numGrams > nGramsMap.length) numGrams = nGramsMap.length;
		
		numGrams = Math.round(numGrams);
	}
	
	previousTokens = previousTokens.slice(
		previousTokens.length - numGrams,
		previousTokens.length
	);
	
	const nGrams = nGramsMap[numGrams - 1];
	
	let firstPreviousToken = previousTokens[0];
	if(!firstPreviousToken) firstPreviousToken = rn(Object.keys(nGrams));
	
	let currentNode;
	
	if(firstPreviousToken in nGrams) {
		currentNode = nGrams[firstPreviousToken];
	} else {
		currentNode = rn(Object.values(nGrams));
	}
	
	for(let i = 1; i < previousTokens.length; i++) {
		let previousToken = previousTokens[i];
		
		if(typeof currentNode[previousToken] === "object") {
			currentNode = currentNode[previousToken];
		} else {
			break;
		}
	}
	
	console.log("Number of grams of context:", numGrams);
	
	if(typeof Object.values(currentNode)[0] === "number") {
		return currentNode;
	}
	
	const simplifiedNGramsNum = numGrams - 1;
	if(simplifiedNGramsNum < 1) return rn(Object.values(nGramsMap[0]));
	
	const simplifiedNGrams = nGramsMap[simplifiedNGramsNum - 1];
	return getNode(originalPreviousTokens, simplifiedNGramsNum, true, temperature, nGramsMap);
}

function findWordFromWeights(node) {
	let totalWeight = 0;

	for(const weight of Object.values(node)) {
		totalWeight += weight;
	}

	const randomWeight = Math.random() * totalWeight;

	let cumulativeWeight = 0;

	for (const [word, weight] of Object.entries(node)) {
		cumulativeWeight += weight;
		
		if (randomWeight <= cumulativeWeight) {
			return word;
		}
	}

	return null; 
}

function nextTokenFromNode(node, temperature) {
	let newNode = {};
	
	for(const [ word, weight ] of Object.entries(node)) {
		let modifier = (Math.random() * 2) * temperature - 1;
		let newWeight = weight + modifier;
		
		while(newWeight === 0) {
			modifier = Math.random() * temperature;
			newWeight = weight * modifier;
		}
		
		newNode[word] = newWeight;
 	}
	
	let nextToken = findWordFromWeights(newNode);
	
	return nextToken;
}

function generateNextToken(numGrams, generatedTokens, temperature, nGramsMap) {
	const previousTokens = getPreviousTokens(numGrams, generatedTokens);
	const node = getNode(previousTokens, numGrams, false, temperature, nGramsMap);
	const nextToken = nextTokenFromNode(node, temperature);
	
	return nextToken;
}

function tokensToText(tokens) {
	return tokens.join(" ")
		.trim()
		.replace(/\s\n\s/g, "\n")
		.replace(/ \. com/g, ".com")
		.replace(/ \. org/g, ".org")
		.replace(/ \. net/g, ".net")
		.replace(/ \%/g, "%")
		.replace(/ \./g, ".")
		.replace(/ \:/g, ":")
		.replace(/\.\s(\d)/g, ".$1")
		.replace(/ \, /g, ", ")
		.replace(/ \!/g, "!")
		.replace(/ \?/g, "?")
		.replace(/\$ /g, "$")
		.replace(/(\w) (\') (\w)/g, "$1$2$3")
		.replace(/\s(“)\s(\w)/g, " $1$2")
		.replace(/(\w)\s(”)\s/g, "$1$2 ")
		.replace(/\s(\()\s(\w)/g, " $1$2")
		.replace(/(\w)\s(\))\s/g, "$1$2 ")
		.replace(/(\w)\s(\-)\s(\w)/g, "$1$2$3")
		.replace(/  /g, " ");
}

function generateText(numGrams, gramsToGenerate, temperature, nGramsMap) {
	const generatedTokens = [];
	
	for(let i = 0; i < gramsToGenerate; i++) {
		let token = generateNextToken(numGrams, generatedTokens, temperature, nGramsMap);
		generatedTokens.push(token);
	}
	
	let text = tokensToText(generatedTokens);
	return text;
}

function isAlphaNumeric(str) {
	var code, i, len;

	for (i = 0, len = str.length; i < len; i++) {
		code = str.charCodeAt(i);
		if (!(code > 47 && code < 58) && // numeric (0-9)
			!(code > 64 && code < 91) && // upper alpha (A-Z)
			!(code > 96 && code < 123)) { // lower alpha (a-z)
			return false;
		}
	}
	
	return true;
}

function addTokenOccurrence(model, token, multiplier, nextTokens) {
	
	if(token in model) {
		let currentNode = model[token];
		
		for(let i = 0; i < nextTokens.length; i++) {
			let tk = nextTokens[i];
			
			if(i === nextTokens.length - 1) {
				if(tk in currentNode) {
					if(typeof currentNode[tk] === "number") {
						currentNode[tk] += multiplier;
					} else {
						currentNode[tk] = multiplier;
					}
				} else {
					currentNode[tk] = multiplier;
				}
			} else {
				if(!(tk in currentNode)) {
					currentNode[tk] = {
						[nextTokens[i + 1]]: {}
					};
				}
				
				currentNode = currentNode[tk];
			}
		}
	} else {
		model[token] = {};
		let currentNode = model[token];
		
		for(let i = 0; i < nextTokens.length; i++) {
			let tk = nextTokens[i];
			
			if(i === nextTokens.length - 1) {
				currentNode[tk] = multiplier;
			} else {
				currentNode[tk] = {};
				
				currentNode = currentNode[tk];
			}
		}
	}
}

function constructNGrams(tokenLists, numGrams) {
	const model = {};
	
	let totalTokens = 0;
	
	for(const tokens of tokenLists) {
		totalTokens += tokens.length;
	}
	
	for(const tokens of tokenLists) {
		const multiplier = totalTokens / tokens.length;
		
		for(let i = 0; i < tokens.length - numGrams; i++) {
			let token = tokens[i];
			let nextTokens = tokens.slice(i + 1, i + numGrams + 1);

			addTokenOccurrence(model, token, multiplier, nextTokens);
		}
	}
	
	return model;
}

function handleGenerateClick() {
	const text = corpusInput.value.trim();
	const text2 = corpus2Input.value.trim();
	
	const tokens = tokenizeText(text);
	const tokens2 = tokenizeText(text2);
	
	if(!tokens.length && !tokens2.length) {
		alert("You need to input corpus text! :)");
		return;
	}
	
	const corpus2Exists = !!tokens2.length;
	
	if(tokens.length < numGrams * 2 && (corpus2Exists ? tokens2.length < numGrams * 2 : true)) {
		alert("You haven't put enough text!");
		return;
	}
	
	let nGramsMap = [];
	
	for(let i = 0; i < numGrams * 2; i++) {
		nGramsMap.push(constructNGrams(corpus2Exists ? [tokens, tokens2] : [tokens], i + 1));
	}
	
	const generatedText = generateText(numGrams, gramsToGenerate, temperature, nGramsMap);
	applyGeneratedText(generatedText);
}

generateBtn.addEventListener("click", handleGenerateClick);

function removeTimestamps(text) {
	return text.replace(/((\d+:)+)\d+\n([^\n]+)\n?/g, "$3 ");
}

function removeBracketCitations(text) {
	return text.replace(/\s*\[\d+\]\s*/g, "");
}

function onInputCorpus(e) {
	let modifiedText = removeBracketCitations(e.target.value);
	modifiedText = removeTimestamps(modifiedText);
	
	e.target.value = modifiedText;
}

corpusInput.addEventListener("input", onInputCorpus);
corpus2Input.addEventListener("input", onInputCorpus);
