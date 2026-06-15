<?php

/**
 * Test script for AgentRouter integration
 * Run: php test.php
 */

require_once __DIR__ . '/AgentRouterClient.php';

// Your AgentRouter API key
$apiKey = 'sk-QNPZflCJdaeQ3odJOgfYhaCpJbi1DDEnKcHASkrSQeqhnVPO';

echo "=== AgentRouter Integration Test ===\n\n";

$client = new AgentRouterClient($apiKey);

// Check configuration
echo "1. Configuration Check:\n";
echo "   API Key configured: " . ($client->isConfigured() ? 'YES' : 'NO') . "\n";
echo "   API Base: https://api.agentrouter.org/v1\n\n";

if (!$client->isConfigured()) {
    echo "ERROR: AgentRouter API key not configured.\n";
    exit(1);
}

// Test 1: List models
echo "2. Testing Models List...\n";
try {
    $models = $client->listModels();
    echo "   SUCCESS: Found " . count($models) . " models\n";
    if (!empty($models)) {
        echo "   First few models:\n";
        foreach (array_slice($models, 0, 5) as $model) {
            $id = is_array($model) ? ($model['id'] ?? 'unknown') : (string)$model;
            echo "     - " . $id . "\n";
        }
    }
} catch (Throwable $e) {
    echo "   FAILED: " . $e->getMessage() . "\n";
}
echo "\n";

// Test 2: Simple chat completion
echo "3. Testing Chat Completion...\n";
try {
    $reply = $client->complete(
        'Say "Hello from AgentRouter!" in Arabic and English.',
        'You are a helpful assistant. Respond briefly.'
    );
    echo "   SUCCESS!\n";
    echo "   Reply: " . $reply . "\n";
} catch (Throwable $e) {
    echo "   FAILED: " . $e->getMessage() . "\n";
}
echo "\n";

// Test 3: Multi-turn conversation
echo "4. Testing Multi-turn Conversation...\n";
try {
    $messages = [
        ['role' => 'system', 'content' => 'You are a trading assistant. Be concise.'],
        ['role' => 'user', 'content' => 'What is the current price of Bitcoin?'],
    ];
    $result = $client->chat($messages);
    $reply = (string)($result['choices'][0]['message']['content'] ?? '');
    echo "   SUCCESS!\n";
    echo "   Reply: " . $reply . "\n";
    echo "   Model: " . ($result['model'] ?? 'unknown') . "\n";
    if (isset($result['usage'])) {
        echo "   Tokens used: " . json_encode($result['usage']) . "\n";
    }
} catch (Throwable $e) {
    echo "   FAILED: " . $e->getMessage() . "\n";
}
echo "\n";

echo "=== Test Complete ===\n";
