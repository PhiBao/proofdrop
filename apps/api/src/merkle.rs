use alloy::primitives::{keccak256, Address, B256};

/// Index-bound Merkle tree.
///
/// Leaf = keccak256(abi.encodePacked(uint32(index), address)).
/// Parent = keccak256(left ++ right). The tree is padded by repeating the last
/// leaf. This is the exact scheme verified by ProofDrop._verify.
#[derive(Debug, Clone)]
pub struct MerkleTree {
    levels: Vec<Vec<B256>>,
}

impl MerkleTree {
    pub fn from_entries(entries: &[(u32, Address)]) -> Self {
        let leaves = entries
            .iter()
            .map(|(index, address)| leaf(*index, *address))
            .collect();
        Self::new(leaves)
    }

    pub fn new(mut leaves: Vec<B256>) -> Self {
        if leaves.is_empty() {
            return Self { levels: vec![] };
        }
        let mut size = 1usize;
        while size < leaves.len() {
            size *= 2;
        }
        let last = *leaves.last().expect("non-empty");
        leaves.resize(size, last);

        let mut levels = vec![leaves];
        while levels.last().expect("level").len() > 1 {
            let current = levels.last().expect("level");
            let mut next = Vec::with_capacity(current.len() / 2);
            for pair in current.chunks(2) {
                let mut buf = Vec::with_capacity(64);
                buf.extend_from_slice(pair[0].as_slice());
                buf.extend_from_slice(pair[1].as_slice());
                next.push(keccak256(buf));
            }
            levels.push(next);
        }
        Self { levels }
    }

    pub fn root(&self) -> B256 {
        self.levels
            .last()
            .and_then(|level| level.first().copied())
            .unwrap_or(B256::ZERO)
    }

    pub fn proof(&self, index: usize) -> Vec<B256> {
        if self.levels.is_empty() || index >= self.levels[0].len() {
            return vec![];
        }
        let mut proof = Vec::with_capacity(self.levels.len().saturating_sub(1));
        let mut idx = index;
        for level in self.levels.iter().take(self.levels.len() - 1) {
            let sibling = if idx % 2 == 0 { idx + 1 } else { idx - 1 };
            proof.push(level[sibling]);
            idx /= 2;
        }
        proof
    }
}

pub fn leaf(index: u32, address: Address) -> B256 {
    let mut buf = Vec::with_capacity(24);
    buf.extend_from_slice(&index.to_be_bytes());
    buf.extend_from_slice(address.as_slice());
    keccak256(buf)
}

pub fn verify(proof: &[B256], root: B256, index: u32, value: B256) -> bool {
    let mut computed = value;
    for (i, sibling) in proof.iter().enumerate() {
        let mut buf = Vec::with_capacity(64);
        if (index >> i) & 1 == 1 {
            buf.extend_from_slice(sibling.as_slice());
            buf.extend_from_slice(computed.as_slice());
        } else {
            buf.extend_from_slice(computed.as_slice());
            buf.extend_from_slice(sibling.as_slice());
        }
        computed = keccak256(buf);
    }
    computed == root
}

#[cfg(test)]
mod tests {
    use super::*;
    use alloy::primitives::address;

    #[test]
    fn builds_and_verifies_proofs() {
        let entries: Vec<(u32, Address)> = (0..5)
            .map(|i| (i, address!("0000000000000000000000000000000000000001")))
            .collect();
        let tree = MerkleTree::from_entries(&entries);
        for (i, (index, addr)) in entries.iter().enumerate() {
            let proof = tree.proof(i);
            assert!(verify(&proof, tree.root(), *index, leaf(*index, *addr)));
        }
    }

    #[test]
    fn single_leaf_root_is_leaf() {
        let addr = address!("0000000000000000000000000000000000000001");
        let tree = MerkleTree::from_entries(&[(0, addr)]);
        assert_eq!(tree.root(), leaf(0, addr));
        assert!(tree.proof(0).is_empty());
    }
}
